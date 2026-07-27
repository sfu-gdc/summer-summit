import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { PUDDLE_DEFAULTS } from '../config';
import { createPuddleSimulation, type PuddleSimulationOptions } from '../runtime/puddleSimulation';
import { decodePuddleSnapshot, remapCenteredDepth } from '../snapshot/binary';

const COLS = 65;
const ROWS = 38;
const FRAME_SECONDS = 1 / 60;

const simulation: PuddleSimulationOptions = {
	seed: PUDDLE_DEFAULTS.seed,
	level: PUDDLE_DEFAULTS.level,
	noiseAmp: PUDDLE_DEFAULTS.noiseAmp,
	bowlWidth: PUDDLE_DEFAULTS.bowlWidth,
	bowlHeight: PUDDLE_DEFAULTS.bowlHeight,
	bowlAmp: PUDDLE_DEFAULTS.bowlAmp,
	bowlRim: PUDDLE_DEFAULTS.bowlRim,
	integrator: PUDDLE_DEFAULTS.integrator,
	momentumSmoothing: PUDDLE_DEFAULTS.momentumSmoothing,
	momentumRetention: PUDDLE_DEFAULTS.momentumRetention,
	timeScale: PUDDLE_DEFAULTS.timeScale,
	baseSubstep: PUDDLE_DEFAULTS.baseSubstep,
	cflSafety: PUDDLE_DEFAULTS.cflSafety,
	minWaveDepth: PUDDLE_DEFAULTS.minWaveDepth,
	maxSubsteps: PUDDLE_DEFAULTS.maxSubsteps,
	gravityDrift: PUDDLE_DEFAULTS.gravityDrift,
	driftAmp: PUDDLE_DEFAULTS.driftAmp,
	driftRateHz: PUDDLE_DEFAULTS.driftRateHz,
	rainInterval: PUDDLE_DEFAULTS.rainInterval,
	rainAmount: PUDDLE_DEFAULTS.rainAmount,
	rainRadius: PUDDLE_DEFAULTS.rainRadius,
};

function wetRowSpan(height: ArrayLike<number>): number {
	let first = ROWS;
	let last = -1;
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			if ((height[y * COLS + x] ?? 0) <= PUDDLE_DEFAULTS.threshold) continue;
			first = Math.min(first, y);
			last = Math.max(last, y);
			break;
		}
	}
	return last >= first ? last - first + 1 : 0;
}

async function loadInitialDepth(): Promise<Float32Array> {
	const contents = await readFile(path.resolve('static/puddle/large.bin'));
	const buffer = contents.buffer.slice(
		contents.byteOffset,
		contents.byteOffset + contents.byteLength,
	);
	return remapCenteredDepth(decodePuddleSnapshot(buffer), COLS, ROWS, PUDDLE_DEFAULTS.cellSize);
}

function spans(
	initialDepth: Float32Array,
	overrides: Partial<PuddleSimulationOptions>,
	tiltY = 0,
): readonly [number, number, number] {
	const sim = createPuddleSimulation(
		{
			width: COLS * PUDDLE_DEFAULTS.cellSize,
			height: ROWS * PUDDLE_DEFAULTS.cellSize,
			cols: COLS,
			rows: ROWS,
			cellSize: PUDDLE_DEFAULTS.cellSize,
		},
		{ ...simulation, ...overrides },
	);
	sim.loadHeight(initialDepth);
	sim.settle(6);
	sim.setTiltOffset(0, tiltY);
	const massCap = sim.totalMass();
	const result: number[] = [wetRowSpan(sim.height)];
	for (let frame = 1; frame <= 60; frame++) {
		const stats = sim.advance(FRAME_SECONDS);
		sim.clampMass(massCap, stats);
		if (frame === 24 || frame === 60) result.push(wetRowSpan(sim.height));
	}
	return result as unknown as readonly [number, number, number];
}

describe('rapid vertical expansion force diagnostic', () => {
	test('isolates rain as the expansion source over the same simulated interval', async () => {
		const initialDepth = await loadInitialDepth();
		const disabled = spans(initialDepth, { gravityDrift: false, rainAmount: 0 });
		const driftOnly = spans(initialDepth, { rainAmount: 0 });
		const rainOnly = spans(initialDepth, { gravityDrift: false });
		const defaults = spans(initialDepth, {});
		const tiltOnly = spans(
			initialDepth,
			{ gravityDrift: false, rainAmount: 0 },
			-PUDDLE_DEFAULTS.cursorTilt,
		);

		expect(driftOnly[2] - disabled[2]).toBeLessThanOrEqual(1);
		expect(rainOnly[2] - disabled[2]).toBeGreaterThanOrEqual(5);
		expect(defaults[2] - disabled[2]).toBeGreaterThanOrEqual(5);
		expect(tiltOnly[2] - disabled[2]).toBeLessThanOrEqual(2);
	});
});
