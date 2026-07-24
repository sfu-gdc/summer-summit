import { type SubstepSeconds, substepSeconds } from './brands';
import { params as paramSchema } from './params';
import type { GovernorPolicy, SubstepPlan } from './types';

export const BASE_SUBSTEP = paramSchema.baseSubstep.default;

export const DEFAULT_MAX_SUBSTEPS = 8;

function substepCount(frameDt: number, substepDt: number, maxSubsteps: number): number {
	const desiredSubsteps = substepDt > 0 ? Math.floor(frameDt / substepDt) : 0;
	return Math.max(0, Math.min(maxSubsteps, desiredSubsteps));
}

export function makeGovernor(maxSubsteps: number): GovernorPolicy {
	return ({ frameDt, stats, integrator, params }) => {
		const stableDt = integrator.maxStableDt(stats, params);
		const substepDt = Math.min(params.baseSubstep, stableDt);
		// Floor preserves the accumulator remainder; rounding would overdraw its budget.
		return {
			substeps: substepCount(frameDt, substepDt, maxSubsteps),
			dt: substepSeconds(substepDt),
		} satisfies SubstepPlan;
	};
}

export const defaultGovernor: GovernorPolicy = makeGovernor(DEFAULT_MAX_SUBSTEPS);

export function maxFrameBudget(maxSubsteps: number, baseSubstep: number): SubstepSeconds {
	return substepSeconds(maxSubsteps * baseSubstep);
}
