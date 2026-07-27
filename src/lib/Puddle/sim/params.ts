import { worldUnits, type WorldUnits } from './brands';

export interface ParamSpec {
	readonly default: number;
	readonly min: number;
	readonly max: number;
}
export type ParamSchema = Record<string, ParamSpec>;

export const params = {
	gravity: { default: 9.8, min: 0.1, max: 40 },
	damping: { default: 0.96, min: 0, max: 0.9999 },
	level: { default: worldUnits(0.58), min: 0.05, max: 4 },
	noiseAmp: { default: worldUnits(0.4), min: 0, max: 2 },
	noiseFreq: { default: 3.4, min: 0.1, max: 16 },
	tiltX: { default: 0, min: -20, max: 20 },
	tiltY: { default: 0, min: -20, max: 20 },
	// Prevents unstable velocity near a dry shoreline.
	depthFloor: { default: worldUnits(0.02), min: 1e-4, max: 1 },
	// Blend toward the 4-neighbor mean to suppress grid-scale oscillation.
	momentumSmoothing: { default: 0.5, min: 0, max: 1 },
	// Per-step momentum retention; 1 is lossless.
	momentumRetention: { default: 0.82, min: 0, max: 1 },
	// CFL margin in dt = cflSafety * dx / sqrt(g * hMax).
	cflSafety: { default: 0.9, min: 0.1, max: 1 },
	// Avoids an infinite CFL timestep in a dry domain.
	minWaveDepth: { default: worldUnits(0.001), min: 1e-4, max: 1 },
	// Target timestep, further limited by CFL.
	baseSubstep: { default: 0.08, min: 0.005, max: 0.5 },
	// Simulated seconds per real second.
	timeScale: { default: 6, min: 0.1, max: 30 },
	// Terrain bowl dimensions in normalized [-0.5, 0.5] space.
	bowlHalfX: { default: 0.34, min: 0.05, max: 0.5 },
	bowlHalfY: { default: 0.3, min: 0.05, max: 0.5 },
	bowlRadius: { default: 0.16, min: 0, max: 0.5 },
	bowlRim: { default: 0.22, min: 0.02, max: 0.5 },
	bowlAmp: { default: worldUnits(1.4), min: 0.1, max: 8 },
} as const satisfies ParamSchema;

export type ParamKey = keyof typeof params;
export type Params = {
	[Key in ParamKey]: (typeof params)[Key]['default'] extends WorldUnits ? WorldUnits : number;
};
export type ParamOverrides = Partial<Record<ParamKey, number>>;

function clamp(value: number, parameterSpec: ParamSpec): number {
	if (!Number.isFinite(value)) return parameterSpec.default;
	return Math.min(parameterSpec.max, Math.max(parameterSpec.min, value));
}

export function resolveParams(overrides: ParamOverrides = {}): Params {
	return Object.fromEntries(
		(Object.keys(params) as ParamKey[]).map((key) => {
			const override = overrides[key];
			return [key, override === undefined ? params[key].default : clamp(override, params[key])];
		}),
	) as Params;
}
