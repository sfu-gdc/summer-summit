import type { Seconds } from './brands';
import { valueNoise } from './noise';
import type { GravityDriver, GravitySample } from './types';

const finiteOrFallback = (value: number | undefined, fallback: number): number =>
	value !== undefined && Number.isFinite(value) ? value : fallback;

/** Fixed hydrostatic gravity plus a constant in-plane tilt. */
export function constantGravity(perpendicular: number, tiltX = 0, tiltY = 0): GravityDriver {
	const sample: GravitySample = { perp: perpendicular, tiltX, tiltY };
	return {
		sample: () => sample,
		serialize: () => ({ kind: 'constant', perp: perpendicular, tiltX, tiltY }),
	};
}

export function offsetGravity(
	baseGravity: GravityDriver,
	getOffset: () => { readonly x: number; readonly y: number },
): GravityDriver {
	const sample = (time: Seconds): GravitySample => {
		const baseSample = baseGravity.sample(time);
		const offset = getOffset();
		return {
			perp: baseSample.perp,
			tiltX: baseSample.tiltX + offset.x,
			tiltY: baseSample.tiltY + offset.y,
		};
	};
	return {
		sample,
		serialize: () => ({ kind: 'offset', base: baseGravity.serialize(), offset: getOffset() }),
	};
}

export function noiseGravity(options: {
	perp: number;
	amp?: number | undefined;
	rateHz?: number | undefined;
	seed?: number | undefined;
}): GravityDriver {
	const { perp } = options;
	// finite-guard, not `??`: a NaN drift amp/rate would poison the tilt forever.
	const amplitude = finiteOrFallback(options.amp, 2);
	const rateHz = finiteOrFallback(options.rateHz, 0.05);
	const seed = options.seed ?? 1;
	const sample = (time: Seconds): GravitySample => {
		const phase = time * rateHz;
		return {
			perp,
			tiltX: (valueNoise(phase, 0, seed) - 0.5) * 2 * amplitude,
			tiltY: (valueNoise(0, phase, seed + 7) - 0.5) * 2 * amplitude,
		};
	};
	return { sample, serialize: () => ({ kind: 'noise', perp, amp: amplitude, rateHz, seed }) };
}
