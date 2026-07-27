import type { PuddleSimulationOptions } from '../runtime/puddleSimulation';

export const PUDDLE_TERRAIN_VERSION = 1;

export interface SnapshotCompatibilityOptions {
	readonly cellSize: number;
	readonly settleSubsteps: number;
	readonly simulation: PuddleSimulationOptions;
}

function fnv1a(value: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function snapshotCompatibilityHash(options: SnapshotCompatibilityOptions): number {
	const simulation = options.simulation;
	return fnv1a(
		[
			PUDDLE_TERRAIN_VERSION,
			options.cellSize,
			options.settleSubsteps,
			simulation.seed,
			simulation.level,
			simulation.noiseAmp,
			simulation.bowlWidth,
			simulation.bowlHeight,
			simulation.bowlAmp,
			simulation.bowlRim,
			simulation.integrator,
			simulation.momentumSmoothing,
			simulation.momentumRetention,
			simulation.timeScale,
			simulation.baseSubstep,
			simulation.cflSafety,
			simulation.minWaveDepth,
			simulation.maxSubsteps,
			simulation.gravityDrift,
			simulation.driftAmp,
			simulation.driftRateHz,
			simulation.rainInterval,
			simulation.rainAmount,
			simulation.rainRadius,
		].join('|'),
	);
}
