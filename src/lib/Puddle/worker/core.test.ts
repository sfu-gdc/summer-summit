import { expect, test } from 'vitest';

import { PUDDLE_DEFAULTS } from '../config';
import { encodePuddleSnapshot } from '../snapshot/binary';
import { snapshotCompatibilityHash } from '../snapshot/compatibility';
import { initializePuddleWorkerState } from './core';
import type { PuddleWorkerInitMessage } from './protocol';

const simulation = {
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

test('worker core accepts a compatible snapshot and remaps it to the measured grid', async () => {
	const compatibilityHash = snapshotCompatibilityHash({
		cellSize: PUDDLE_DEFAULTS.cellSize,
		settleSubsteps: PUDDLE_DEFAULTS.settleSubsteps,
		simulation,
	});
	const buffer = encodePuddleSnapshot({
		nx: 8,
		ny: 8,
		cellSize: PUDDLE_DEFAULTS.cellSize,
		guardBand: 1,
		seed: PUDDLE_DEFAULTS.seed,
		compatibilityHash,
		totalMass: 0,
		depth: new Float32Array(64),
	});
	const message: PuddleWorkerInitMessage = {
		type: 'init',
		generation: 1,
		width: 280,
		height: 196,
		geometry: { cellSize: PUDDLE_DEFAULTS.cellSize, maxCells: 200 },
		simulation,
		settleSubsteps: PUDDLE_DEFAULTS.settleSubsteps,
		threshold: PUDDLE_DEFAULTS.threshold,
		animated: false,
		snapshotUrl: '/puddle/default.bin',
		compatibilityHash,
		cursorTilt: PUDDLE_DEFAULTS.cursorTilt,
		cursorEase: PUDDLE_DEFAULTS.cursorEase,
		deviceEase: PUDDLE_DEFAULTS.deviceEase,
	};

	const state = await initializePuddleWorkerState(message, () => Promise.resolve(buffer));

	expect(state.snapshotLoaded).toBe(true);
	expect(state.nx).toBe(12);
	expect(state.ny).toBe(9);
	expect(state.cellSize).toBe(PUDDLE_DEFAULTS.cellSize);
	expect(state.massCap).toBe(0);
	expect(state.path()).toBe('');
	expect(state.path()).toBeNull();

	state.sim.splat(0, 0, 1, 0.01);
	expect(state.path()).toBeNull();
});
