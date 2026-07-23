import type { PuddleProps } from '../config';
import type { PuddleGeometry } from '../geometry';
import { createWaterSim, type WaterSim } from '../sim';

type PuddleSimulationProp =
	| 'seed'
	| 'level'
	| 'noiseAmp'
	| 'integrator'
	| 'momentumSmoothing'
	| 'momentumRetention'
	| 'timeScale'
	| 'baseSubstep'
	| 'cflSafety'
	| 'minWaveDepth'
	| 'maxSubsteps'
	| 'gravityDrift'
	| 'driftAmp'
	| 'driftRateHz'
	| 'rainInterval'
	| 'rainAmount'
	| 'rainRadius';

export type PuddleSimulationOptions = Required<Pick<PuddleProps, PuddleSimulationProp>>;

export function createPuddleSimulation(
	geometry: Pick<PuddleGeometry, 'cols' | 'rows'>,
	options: PuddleSimulationOptions,
): WaterSim {
	return createWaterSim({
		nx: geometry.cols,
		ny: geometry.rows,
		seed: options.seed,
		level: options.level,
		noiseAmp: options.noiseAmp,
		integrator: options.integrator,
		momentumSmoothing: options.momentumSmoothing,
		momentumRetention: options.momentumRetention,
		timeScale: options.timeScale,
		baseSubstep: options.baseSubstep,
		cflSafety: options.cflSafety,
		minWaveDepth: options.minWaveDepth,
		maxSubsteps: options.maxSubsteps,
		gravityDrift: options.gravityDrift,
		driftAmp: options.driftAmp,
		driftRateHz: options.driftRateHz,
		rain: {
			intervalSec: options.rainInterval,
			amount: options.rainAmount,
			radius: options.rainRadius,
		},
	});
}
