import { describe, expect, it } from 'vitest';

import type { FluxField } from './types';
import { createWaterSim } from './index';

interface InternalSim {
	engine: { resources: { currentFlux: () => FluxField } };
}

interface CheckerSample {
	parityFraction: number;
	lagSignature: number;
}

function percentile(values: number[], fraction: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;
}

function isNearShoreline(
	depth: Float32Array,
	nx: number,
	ny: number,
	column: number,
	row: number,
): boolean {
	let hasWetCell = false;
	let hasDryCell = false;
	for (let y = Math.max(0, row - 1); y <= Math.min(ny - 1, row + 1); y++) {
		for (let x = Math.max(0, column - 1); x <= Math.min(nx - 1, column + 1); x++) {
			if ((depth[y * nx + x] ?? 0) > 0.15) hasWetCell = true;
			else hasDryCell = true;
		}
	}
	return hasWetCell && hasDryCell;
}

function checkerSample(
	field: Float32Array,
	width: number,
	height: number,
	include: (column: number, row: number) => boolean,
): CheckerSample | undefined {
	const residual = new Float64Array(field.length);
	const active = new Uint8Array(field.length);
	let residualEnergy = 0;
	let parityProjection = 0;
	let activeCount = 0;
	for (let row = 1; row < height - 1; row++) {
		for (let column = 1; column < width - 1; column++) {
			if (!include(column, row)) continue;
			const index = row * width + column;
			const neighborMean =
				((field[index - 1] ?? 0) +
					(field[index + 1] ?? 0) +
					(field[index - width] ?? 0) +
					(field[index + width] ?? 0)) /
				4;
			const value = (field[index] ?? 0) - neighborMean;
			residual[index] = value;
			active[index] = 1;
			residualEnergy += value * value;
			parityProjection += value * ((column + row) % 2 === 0 ? 1 : -1);
			activeCount++;
		}
	}
	if (activeCount < 8 || residualEnergy === 0) return undefined;

	const correlation = (lag: number) => {
		let product = 0;
		let firstEnergy = 0;
		let secondEnergy = 0;
		for (let row = 1; row < height - 1; row++) {
			for (let column = 1; column < width - 1; column++) {
				const index = row * width + column;
				if (active[index] !== 1) continue;
				for (const next of [index + lag, index + lag * width]) {
					if (active[next] !== 1) continue;
					product += residual[index] * residual[next];
					firstEnergy += residual[index] ** 2;
					secondEnergy += residual[next] ** 2;
				}
			}
		}
		return firstEnergy > 0 && secondEnergy > 0
			? product / Math.sqrt(firstEnergy * secondEnergy)
			: 0;
	};
	return {
		parityFraction: (parityProjection * parityProjection) / (activeCount * residualEnergy),
		lagSignature: (correlation(2) - correlation(1)) / 2,
	};
}

function runStrongTilt(seed: number) {
	const nx = 29;
	const ny = 16;
	const sim = createWaterSim({
		nx,
		ny,
		seed,
		integrator: 'pipes+momentum',
		level: 0.58,
		momentumSmoothing: 0,
		momentumRetention: 0.82,
		gravityDrift: false,
	});
	sim.settle(60);
	sim.setTiltOffset(-8, 0);
	const samples: CheckerSample[] = [];
	for (let step = 0; step < 120; step++) {
		sim.step(0.05);
		if (step < 10) continue;
		const depth = sim.height;
		const flux = (sim as unknown as InternalSim).engine.resources.currentFlux();
		const fx = checkerSample(flux.fx, nx + 1, ny, (column, row) =>
			[clamp(column - 1, 0, nx - 1), clamp(column, 0, nx - 1)].some((x) =>
				isNearShoreline(depth, nx, ny, x, row),
			),
		);
		const fy = checkerSample(flux.fy, nx, ny + 1, (column, row) =>
			[clamp(row - 1, 0, ny - 1), clamp(row, 0, ny - 1)].some((y) =>
				isNearShoreline(depth, nx, ny, column, y),
			),
		);
		if (fx) samples.push(fx);
		if (fy) samples.push(fy);
	}
	return samples;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}

describe('momentum checkerboard regression', () => {
	it('does not develop a coherent odd/even shoreline mode under strong tilt', () => {
		const samples = Array.from({ length: 8 }, (_, index) => runStrongTilt(index + 1)).flat();
		const parity = samples.map(({ parityFraction }) => parityFraction);
		const lag = samples.map(({ lagSignature }) => lagSignature);
		expect(samples.length).toBeGreaterThan(0);
		// A coherent checkerboard approaches 1 for both metrics.
		expect(percentile(parity, 0.95)).toBeLessThan(0.03);
		expect(percentile(lag, 0.95)).toBeLessThan(0.17);
	});
});
