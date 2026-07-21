import { describe, expect, it } from 'vitest';

import { seconds, worldUnits } from './brands';
import { rainEmitter } from './emitters';
import { BASE_SUBSTEP, defaultGovernor } from './governor';
import { integrators } from './integrators';
import { resolveParams } from './params';
import { createRng } from './rng';
import type { StateStats } from './types';
import { createWaterSim } from './index';

function minimumOf(values: Float32Array): number {
	return values.reduce((minimum, value) => Math.min(minimum, value), Infinity);
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
		expect(sim.height.every(Number.isFinite)).toBe(true);
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
		expect(sim.height.every(Number.isFinite)).toBe(true);
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
		expect(sim.height.every(Number.isFinite)).toBe(true);
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
		expect(sim.height.every(Number.isFinite)).toBe(true);
	});
});

describe('resolveParams', () => {
	it('applies defaults, clamps ranges, and rejects non-finite', () => {
		const resolved = resolveParams({ damping: 5, gravity: NaN, level: 0.7 });
		expect(resolved.damping).toBeLessThanOrEqual(0.9999);
		expect(resolved.gravity).toBe(9.8);
		expect(resolved.level).toBeCloseTo(0.7, 6);
	});

	it('exposes momentum tuning as clamped params', () => {
		const resolved = resolveParams({ momentumSmoothing: 5, momentumRetention: -1 });
		expect(resolved.momentumSmoothing).toBe(1);
		expect(resolved.momentumRetention).toBe(0);
		expect(resolveParams({}).momentumRetention).toBeCloseTo(0.82, 6);
	});

	it('exposes timestep/CFL tuning as clamped params with correct defaults', () => {
		const defaults = resolveParams({});
		expect(defaults.cflSafety).toBeCloseTo(0.9, 6);
		expect(defaults.minWaveDepth).toBeCloseTo(0.001, 6);
		expect(defaults.baseSubstep).toBeCloseTo(0.08, 6);
		expect(defaults.timeScale).toBe(6);
		const clamped = resolveParams({ cflSafety: 9, baseSubstep: 0, timeScale: NaN });
		expect(clamped.cflSafety).toBe(1);
		expect(clamped.baseSubstep).toBeGreaterThan(0);
		expect(clamped.timeScale).toBe(6);
	});
});

describe('createWaterSim — governor / grid tuning options', () => {
	it('caps per-frame substeps at the maxSubsteps override', () => {
		const sim = createWaterSim({ nx: 32, ny: 20, seed: 2, maxSubsteps: 1 });
		sim.settle(20);
		expect(sim.advance(10).substeps).toBeLessThanOrEqual(1);
		expect(sim.height.every(Number.isFinite)).toBe(true);
	});

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
		expect(sim.height.every(Number.isFinite)).toBe(true);
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

describe('defaultGovernor', () => {
	const stats: StateStats = { mass: 100, maxDepth: worldUnits(0.6) };
	const params = resolveParams({});

	it('scales substeps with the frame budget and never exceeds CFL dt', () => {
		const smallFramePlan = defaultGovernor({
			frameDt: seconds(BASE_SUBSTEP),
			stats,
			integrator: integrators.pipes,
			params,
		});
		const largeFramePlan = defaultGovernor({
			frameDt: seconds(BASE_SUBSTEP * 5),
			stats,
			integrator: integrators.pipes,
			params,
		});
		expect(smallFramePlan.substeps).toBe(1);
		expect(largeFramePlan.substeps).toBeGreaterThan(smallFramePlan.substeps);
		expect(largeFramePlan.dt).toBeLessThanOrEqual(BASE_SUBSTEP + 1e-9);
	});

	it('caps substeps per frame (no spiral of death)', () => {
		const cappedPlan = defaultGovernor({
			frameDt: seconds(100),
			stats,
			integrator: integrators.pipes,
			params,
		});
		expect(cappedPlan.substeps).toBeLessThanOrEqual(8);
	});
});

describe('rainEmitter — framerate-independent scheduling', () => {
	it('emits the same drop count over the same sim-time regardless of dt chunking', () => {
		const grid = { nx: 10, ny: 10 };
		const emitter = rainEmitter({ intervalSec: 0.5, amount: 1, radius: 1 });
		const countDrops = (dt: number, steps: number) => {
			const rng = createRng(1);
			let time = 0;
			let dropCount = 0;
			for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
				dropCount += emitter({ grid, time: seconds(time), dt: seconds(dt), rng }).length;
				time += dt;
			}
			return dropCount;
		};
		// 5 sim-seconds either way; 0.5 and 0.25 are exact in binary (no fp drift).
		expect(countDrops(0.5, 10)).toBe(10);
		expect(countDrops(0.25, 20)).toBe(10);
	});
});

describe('advance — framerate independence (governor accumulator)', () => {
	it('runs the same total substeps for the same real time regardless of frame size', () => {
		const totalSubsteps = (frameDt: number, frames: number) => {
			const sim = createWaterSim({ nx: 32, ny: 20, seed: 2 });
			sim.settle(30);
			let totalSubstepCount = 0;
			for (let frameIndex = 0; frameIndex < frames; frameIndex++)
				totalSubstepCount += sim.advance(frameDt).substeps;
			return totalSubstepCount;
		};
		const substepsAt30Fps = totalSubsteps(1 / 30, 60);
		const substepsAt60Fps = totalSubsteps(1 / 60, 120);
		const substepsAt120Fps = totalSubsteps(1 / 120, 240);
		// The floor accumulator carries the remainder, so total advanced sim-time
		// is the same (within one substep of quantization) at every frame rate.
		expect(Math.abs(substepsAt60Fps - substepsAt30Fps)).toBeLessThanOrEqual(2);
		expect(Math.abs(substepsAt60Fps - substepsAt120Fps)).toBeLessThanOrEqual(2);
		expect(substepsAt60Fps).toBeGreaterThanOrEqual(147);
		expect(substepsAt60Fps).toBeLessThanOrEqual(151);
	});
});

describe('setTiltOffset — interactive gravity tilt', () => {
	const halfMasses = (sim: { nx: number; ny: number; height: Float32Array }) => {
		return sim.height.reduce(
			({ left, right }, depth, cellIndex) =>
				cellIndex % sim.nx < sim.nx / 2
					? { left: left + depth, right }
					: { left, right: right + depth },
			{ left: 0, right: 0 },
		);
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
		expect(sim.height.every(Number.isFinite)).toBe(true);
	});

	it('clamps a negative clampMass target to zero instead of flipping depths', () => {
		const sim = createWaterSim({ nx: 24, ny: 16, seed: 4 });
		sim.settle(40);
		sim.clampMass(-5);
		expect(minimumOf(sim.height)).toBeGreaterThanOrEqual(0);
		expect(sim.height.every(Number.isFinite)).toBe(true);
	});

	it('hands out a snapshot: writing to sim.height cannot corrupt sim state', () => {
		const sim = createWaterSim({ nx: 24, ny: 16, seed: 4 });
		sim.settle(40);
		// Scribble on the returned buffer — a live-buffer leak would poison the field.
		sim.height.fill(NaN);
		sim.advance(1 / 60);
		expect(Number.isFinite(sim.totalMass())).toBe(true);
		expect(sim.height.every(Number.isFinite)).toBe(true);
	});
});
