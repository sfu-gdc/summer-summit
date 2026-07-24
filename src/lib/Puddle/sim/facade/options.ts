import type { IntegratorId } from '../integrators';
import type { ParamOverrides } from '../params';

export interface WaterSimOptions extends ParamOverrides {
	nx: number;
	ny: number;
	seed?: number;
	/** `'pipes'` or the default momentum-enabled variant `'pipes+momentum'`. */
	integrator?: IntegratorId;
	/** Install a rain emitter (raindrop ripples) for animated use. */
	rain?: boolean | { intervalSec?: number; amount?: number; radius?: number };
	/** Drift the gravity tilt with noise instead of holding it constant. */
	gravityDrift?: boolean;
	/** Noise-drift tilt magnitude (only with `gravityDrift`). */
	driftAmp?: number;
	/** Noise-drift rate in Hz (only with `gravityDrift`). */
	driftRateHz?: number;
	/** Per-frame substep cap (spiral-of-death guard). */
	maxSubsteps?: number;
	/** Grid dimension floor the nx/ny inputs are clamped to. */
	minDim?: number;
	/** Grid dimension ceiling the nx/ny inputs are clamped to (guards against a giant grid). */
	maxDim?: number;
}

export const MIN_DIM = 4;
export const MAX_DIM = 512;

export function finiteOrFallback(value: number | undefined, fallback: number): number {
	return value !== undefined && Number.isFinite(value) ? value : fallback;
}

export function nonnegativeIntegerOrZero(value: number): number {
	return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function clampDimension(dimension: number, minimum: number, maximum: number): number {
	return Number.isFinite(dimension)
		? Math.max(minimum, Math.min(maximum, Math.floor(dimension)))
		: minimum;
}
