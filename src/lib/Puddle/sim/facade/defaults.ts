import type { IntegratorId } from '../integrators';

/** Defaults that affect simulation construction, independent of the Puddle UI. */
export const SIM_DEFAULTS = {
	level: 0.42,
	integrator: 'pipes+momentum',
	momentumSmoothing: 0,
	momentumRetention: 0.98,
	gravityDrift: true,
	driftAmp: 1,
} as const satisfies {
	readonly level: number;
	readonly integrator: IntegratorId;
	readonly momentumSmoothing: number;
	readonly momentumRetention: number;
	readonly gravityDrift: boolean;
	readonly driftAmp: number;
};

export const DEFAULT_SETTLE_SUBSTEPS = 90;
