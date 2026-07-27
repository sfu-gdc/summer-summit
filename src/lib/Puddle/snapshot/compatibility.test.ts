import { describe, expect, test } from 'vitest';

import { PUDDLE_DEFAULTS } from '../config';
import type { PuddleSimulationOptions } from '../runtime/puddleSimulation';
import { snapshotCompatibilityHash, type SnapshotCompatibilityOptions } from './compatibility';

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

const options: SnapshotCompatibilityOptions = {
	cellSize: PUDDLE_DEFAULTS.cellSize,
	settleSubsteps: PUDDLE_DEFAULTS.settleSubsteps,
	simulation,
};

describe('snapshot compatibility hash', () => {
	test.each([
		['cflSafety', 0.7],
		['minWaveDepth', 0.01],
		['gravityDrift', false],
		['driftAmp', 1.5],
		['driftRateHz', 0.25],
	] as const)('changes when %s changes', (key, value) => {
		const changed = {
			...options,
			simulation: { ...simulation, [key]: value },
		};

		expect(snapshotCompatibilityHash(changed)).not.toBe(snapshotCompatibilityHash(options));
	});

	test('changes across terrain, integrator, timestep, and source categories', () => {
		const variants: SnapshotCompatibilityOptions[] = [
			{ ...options, cellSize: options.cellSize + 1 },
			{ ...options, settleSubsteps: options.settleSubsteps + 1 },
			{ ...options, simulation: { ...simulation, seed: simulation.seed + 1 } },
			{ ...options, simulation: { ...simulation, integrator: 'pipes' } },
			{ ...options, simulation: { ...simulation, baseSubstep: simulation.baseSubstep / 2 } },
			{ ...options, simulation: { ...simulation, rainAmount: simulation.rainAmount / 2 } },
		];
		const baseline = snapshotCompatibilityHash(options);

		expect(variants.every((variant) => snapshotCompatibilityHash(variant) !== baseline)).toBe(true);
	});
});
