import { type Seconds, type SubstepSeconds, substepSeconds } from './brands';
import type { Params } from './params';
import type { Integrator, StateStats } from './types';

export const DEFAULT_MAX_SUBSTEPS = 8;

function substepCount(frameDt: number, substepDt: number, maxSubsteps: number): number {
	const desiredSubsteps = substepDt > 0 ? Math.floor(frameDt / substepDt) : 0;
	return Math.max(0, Math.min(maxSubsteps, desiredSubsteps));
}

export function planSubsteps(
	frameDt: Seconds,
	stats: StateStats,
	integrator: Integrator,
	params: Params,
	maxSubsteps: number,
) {
	const stableDt = integrator.maxStableDt(stats, params);
	const substepDt = Math.min(params.baseSubstep, stableDt);
	// Floor preserves the accumulator remainder; rounding would overdraw its budget.
	return {
		substeps: substepCount(frameDt, substepDt, maxSubsteps),
		dt: substepSeconds(substepDt),
	};
}

export function maxFrameBudget(maxSubsteps: number, baseSubstep: number): SubstepSeconds {
	return substepSeconds(maxSubsteps * baseSubstep);
}
