import { describe, expect, it } from 'vitest';

import { resolveParams } from '../params';

describe('resolveParams', () => {
	it('applies defaults, clamps ranges, and rejects non-finite', () => {
		const resolved = resolveParams({ damping: 5, gravity: NaN, level: 0.7 });
		expect(resolved.damping).toBeLessThanOrEqual(0.9999);
		expect(resolved.gravity).toBe(9.8);
		expect(resolved.level).toBeCloseTo(0.7, 6);
	});

	it('exposes momentum tuning as clamped params', () => {
		const resolved = resolveParams({ momentumSmoothing: 5, momentumRetention: -1 });
		expect(resolved.momentumSmoothing).toBe(1);
		expect(resolved.momentumRetention).toBe(0);
		expect(resolveParams({}).momentumRetention).toBeCloseTo(0.82, 6);
	});

	it('exposes timestep/CFL tuning as clamped params with correct defaults', () => {
		const defaults = resolveParams({});
		expect(defaults.cflSafety).toBeCloseTo(0.9, 6);
		expect(defaults.minWaveDepth).toBeCloseTo(0.001, 6);
		expect(defaults.baseSubstep).toBeCloseTo(0.08, 6);
		expect(defaults.timeScale).toBe(6);
		const clamped = resolveParams({ cflSafety: 9, baseSubstep: 0, timeScale: NaN });
		expect(clamped.cflSafety).toBe(1);
		expect(clamped.baseSubstep).toBeGreaterThan(0);
		expect(clamped.timeScale).toBe(6);
	});
});
