import { describe, expect, expectTypeOf, it } from 'vitest';

import { createWaterSim } from '..';

function minimumOf(values: ArrayLike<number>): number {
	return Array.from(values).reduce((minimum, value) => Math.min(minimum, value), Infinity);
}

function allFinite(values: ArrayLike<number>): boolean {
	return Array.from(values).every(Number.isFinite);
}

describe('createWaterSim — invariants', () => {
	it('conserves mass exactly with no sources (pipes)', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, seed: 3, integrator: 'pipes' });
		const massBeforeSettle = sim.totalMass();
		sim.settle(120);
		const massAfterSettle = sim.totalMass();
		expect(Math.abs(massAfterSettle - massBeforeSettle) / massBeforeSettle).toBeLessThan(1e-4);
	});

	it('keeps depth non-negative after a large splat', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, seed: 5 });
		sim.splat(20, 12, 5, 3);
		sim.settle(200);
		expect(minimumOf(sim.height)).toBeGreaterThanOrEqual(0);
	});

	it('stays finite and bounded under rain with a mass cap', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, seed: 9, rain: true });
		sim.settle();
		const massCap = sim.totalMass();
		for (let frameIndex = 0; frameIndex < 200; frameIndex++) {
			sim.advance(1 / 60);
			sim.clampMass(massCap);
		}
		expect(sim.totalMass()).toBeLessThanOrEqual(massCap + 1e-3);
		expect(allFinite(sim.height)).toBe(true);
	});
});

describe('createWaterSim — momentum integrator (pipes+momentum)', () => {
	it('conserves mass and stays non-negative & finite', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, seed: 7, integrator: 'pipes+momentum' });
		const massBeforeSplat = sim.totalMass();
		sim.splat(15, 10, 2, 3);
		const afterSplat = sim.totalMass();
		sim.settle(150);
		expect(Math.abs(sim.totalMass() - afterSplat) / afterSplat).toBeLessThan(1e-4);
		expect(massBeforeSplat).toBeGreaterThan(0);
		expect(minimumOf(sim.height)).toBeGreaterThanOrEqual(0);
		expect(allFinite(sim.height)).toBe(true);
	});
});

describe('createWaterSim — momentum shoreline stability', () => {
	it('does not flicker the thresholded shoreline under strong tilt', () => {
		const nx = 29;
		const ny = 16;
		const threshold = 0.15;
		const sim = createWaterSim({
			nx,
			ny,
			seed: 3,
			integrator: 'pipes+momentum',
			level: 0.58,
			momentumSmoothing: 0.5,
			momentumRetention: 0.82,
			gravityDrift: false,
		});
		sim.settle(60);
		const massStart = sim.totalMass();
		const wetMask = () => Uint8Array.from(sim.height, (height) => (height > threshold ? 1 : 0));
		sim.setTiltOffset(-8, 0);
		let toggleCounts = new Int32Array(nx * ny);
		let previousMask = wetMask();
		for (let stepIndex = 0; stepIndex < 120; stepIndex++) {
			sim.step(0.05);
			const mask = wetMask();
			toggleCounts = Int32Array.from(toggleCounts, (toggleCount, cellIndex) =>
				mask[cellIndex] !== previousMask[cellIndex] ? toggleCount + 1 : toggleCount,
			);
			previousMask = mask;
		}
		// A cell that fills or drains once toggles at most twice.
		expect(toggleCounts.some((toggleCount) => toggleCount > 2)).toBe(false);
		expect(
			toggleCounts.reduce((maximum, count) => Math.max(maximum, count), 0),
		).toBeLessThanOrEqual(2);
		expect(allFinite(sim.height)).toBe(true);
		expect(Math.abs(sim.totalMass() - massStart) / massStart).toBeLessThan(1e-4);
	});
});

describe('createWaterSim — determinism', () => {
	it('same seed + same calls => identical output (seeded RNG)', () => {
		const runSimulation = () => {
			const sim = createWaterSim({ nx: 32, ny: 20, seed: 5, rain: true });
			sim.settle();
			const massCap = sim.totalMass();
			for (let frameIndex = 0; frameIndex < 100; frameIndex++) {
				sim.advance(1 / 60);
				sim.clampMass(massCap);
			}
			return Float32Array.from(sim.height);
		};
		const firstRun = runSimulation();
		const secondRun = runSimulation();
		expect(firstRun.length).toBe(secondRun.length);
		expect(firstRun.every((value, index) => value === secondRun[index])).toBe(true);
	});
});

describe('createWaterSim — input validation', () => {
	it('coerces invalid dimensions to a safe grid without throwing', () => {
		const sim = createWaterSim({ nx: 0, ny: -5 });
		expect(sim.nx).toBeGreaterThanOrEqual(4);
		expect(sim.ny).toBeGreaterThanOrEqual(4);
		expect(sim.height.length).toBe(sim.nx * sim.ny);
	});

	it('clamps non-finite / out-of-range params so the sim stays finite', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, damping: NaN, gravity: -10, level: Infinity });
		sim.settle(120);
		expect(allFinite(sim.height)).toBe(true);
	});
});

describe('createWaterSim — construction tuning options', () => {
	it('clamps nx/ny to the maxDim option', () => {
		const sim = createWaterSim({ nx: 4000, ny: 4000, maxDim: 16 });
		expect(sim.nx).toBe(16);
		expect(sim.ny).toBe(16);
	});

	it('accepts drift tuning and non-finite drift without corrupting the field', () => {
		const sim = createWaterSim({
			nx: 32,
			ny: 20,
			seed: 3,
			gravityDrift: true,
			driftAmp: NaN,
			driftRateHz: 0.2,
		});
		sim.settle(120);
		expect(allFinite(sim.height)).toBe(true);
	});
});

describe('momentum tuning params — threaded to the momentum pass', () => {
	it('changes the settled field when momentumRetention differs', () => {
		const runSimulation = (momentumRetention: number) => {
			const sim = createWaterSim({
				nx: 32,
				ny: 20,
				seed: 7,
				integrator: 'pipes+momentum',
				momentumRetention,
			});
			sim.splat(16, 10, 2, 3);
			sim.settle(12); // short: momentum hasn't fully dissipated yet
			return Float32Array.from(sim.height);
		};
		const lowRetentionHeight = runSimulation(0.2);
		const highRetentionHeight = runSimulation(0.95);
		expect(lowRetentionHeight.length).toBe(highRetentionHeight.length);
		expect(lowRetentionHeight.some((value, index) => value !== highRetentionHeight[index])).toBe(
			true,
		);
		expect(minimumOf(highRetentionHeight)).toBeGreaterThanOrEqual(0);
		expect(highRetentionHeight.every(Number.isFinite)).toBe(true);
	});
});

describe('setTiltOffset — interactive gravity tilt', () => {
	const halfMasses = (sim: { nx: number; height: ArrayLike<number> }) => {
		const masses = { left: 0, right: 0 };
		for (let cellIndex = 0; cellIndex < sim.height.length; cellIndex++) {
			const side = cellIndex % sim.nx < sim.nx / 2 ? 'left' : 'right';
			masses[side] += sim.height[cellIndex] ?? 0;
		}
		return masses;
	};

	it('shifts mass toward +x for a negative x offset (flux-pass sign convention)', () => {
		const sim = createWaterSim({ nx: 40, ny: 24, seed: 3 });
		sim.settle();
		const halfMassesBeforeTilt = halfMasses(sim);
		sim.setTiltOffset(-2, 0);
		sim.settle(300);
		const halfMassesAfterTilt = halfMasses(sim);
		expect(halfMassesAfterTilt.right - halfMassesAfterTilt.left).toBeGreaterThan(
			halfMassesBeforeTilt.right - halfMassesBeforeTilt.left,
		);
		expect(halfMassesAfterTilt.right).toBeGreaterThan(halfMassesAfterTilt.left);
	});

	it('ignores non-finite offsets and conserves mass under tilt', () => {
		const sim = createWaterSim({ nx: 32, ny: 20, seed: 3 });
		sim.settle();
		const mass = sim.totalMass();
		sim.setTiltOffset(NaN, 2);
		sim.setTiltOffset(3, Infinity);
		sim.setTiltOffset(-2, 1);
		sim.settle(200);
		expect(Math.abs(sim.totalMass() - mass) / mass).toBeLessThan(1e-4);
		expect(minimumOf(sim.height)).toBeGreaterThanOrEqual(0);
	});
});

describe('facade — non-finite input guards', () => {
	it('ignores NaN splat/step/clampMass and rain options without corrupting the field', () => {
		const sim = createWaterSim({ nx: 24, ny: 16, seed: 4, rain: { amount: NaN, radius: NaN } });
		sim.settle(40);
		sim.splat(NaN, 5, 1, 2);
		sim.step(NaN);
		sim.clampMass(NaN);
		for (let frameIndex = 0; frameIndex < 30; frameIndex++) sim.advance(1 / 60);
		expect(allFinite(sim.height)).toBe(true);
	});

	it('clamps a negative clampMass target to zero instead of flipping depths', () => {
		const sim = createWaterSim({ nx: 24, ny: 16, seed: 4 });
		sim.settle(40);
		sim.clampMass(-5);
		expect(minimumOf(sim.height)).toBeGreaterThanOrEqual(0);
		expect(allFinite(sim.height)).toBe(true);
	});

	it('exposes height as a read-only array-like view', () => {
		const sim = createWaterSim({ nx: 24, ny: 16, seed: 4 });
		expectTypeOf(sim.height).toEqualTypeOf<ArrayLike<number>>();
		expect(sim.height.length).toBe(sim.nx * sim.ny);
	});
});
