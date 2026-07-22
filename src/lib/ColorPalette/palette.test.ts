import { inGamut, oklch, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { classifyGamut, createHueChromaMap } from './gamutMap';
import { createColorPalette } from './palette';

describe('createColorPalette', () => {
	const target = oklch('oklch(50% 0.2 180)');
	if (!target) throw new Error('Invalid test color');

	const palette = createColorPalette({
		color: target,
		hue: { stops: [0.25, -0.5], interpolator: 'interpolatorLinear' },
		chroma: { stops: [0.25, -0.25], interpolator: 'interpolatorLinear' },
	});

	it('uses the standard lightness stops', () => {
		const expected = [0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];
		palette.forEach(({ color }, index) => {
			expect(color.l).toBeCloseTo(expected[index] ?? 0);
		});
	});

	it('interpolates one continuous curve through stop 500', () => {
		const middle = palette.find(({ stop }) => stop === 500);
		expect(middle?.color.h).toBeCloseTo(135);
		expect(middle?.color.c).toBeCloseTo(0.2);
	});

	it('anchors start at the lightest stop and stop at the dimmest stop', () => {
		const lightEdge = palette.find(({ stop }) => stop === 50);
		const darkEdge = palette.find(({ stop }) => stop === 950);

		expect(lightEdge?.color.h).toBeCloseTo(270);
		expect(lightEdge?.color.c).toBeCloseTo(0.3);
		expect(darkEdge?.color.h).toBeCloseTo(0);
		expect(darkEdge?.color.c).toBeCloseTo(0.1);
	});

	it('interpolates through additional evenly spaced stops', () => {
		const paletteWithMiddleStop = createColorPalette({
			color: target,
			hue: { stops: [0, 0.25, 0], interpolator: 'interpolatorLinear' },
			chroma: { stops: [0, 0.25, 0], interpolator: 'interpolatorLinear' },
		});
		const middle = paletteWithMiddleStop.find(({ stop }) => stop === 500);

		expect(middle?.color.h).toBeCloseTo(270);
		expect(middle?.color.c).toBeCloseTo(0.3);
	});

	it('requires at least two finite interpolation stops', () => {
		expect(() =>
			createColorPalette({
				color: target,
				hue: { stops: [0], interpolator: 'interpolatorLinear' },
				chroma: { stops: [0, 0], interpolator: 'interpolatorLinear' },
			}),
		).toThrow('at least two stops');

		expect(() =>
			createColorPalette({
				color: target,
				hue: { stops: [0, Number.NaN], interpolator: 'interpolatorLinear' },
				chroma: { stops: [0, 0], interpolator: 'interpolatorLinear' },
			}),
		).toThrow('finite numbers');
	});

	it('interprets Display-P3 inputs without clamping generated colors to P3', () => {
		const wideTarget = { mode: 'p3', r: 0, g: 0.3, b: 0.9 } as const;
		const convertedTarget = oklch(wideTarget);
		const widePalette = createColorPalette({
			color: wideTarget,
			hue: { stops: [0, 0], interpolator: 'interpolatorLinear' },
			chroma: { stops: [0, 0], interpolator: 'interpolatorLinear' },
		});
		const middle = widePalette.find(({ stop }) => stop === 500);
		const isInDisplayP3 = inGamut('p3');

		expect(middle?.color.c).toBeCloseTo(convertedTarget.c);
		expect(middle?.color.h).toBeCloseTo(convertedTarget.h ?? 0);
		expect(widePalette.some(({ color }) => !isInDisplayP3(color))).toBe(true);
		expect(middle?.gamut).toBe('display-p3');
		expect(middle?.css).toMatch(/^oklch\(/);
	});

	it('interprets sRGB-derived inputs without clamping generated colors to sRGB', () => {
		const rgbTarget = parse('#4f18ee');
		if (!rgbTarget) throw new Error('Invalid test color');
		const convertedTarget = oklch(rgbTarget);
		const rgbPalette = createColorPalette({
			color: rgbTarget,
			hue: { stops: [0, 0], interpolator: 'interpolatorLinear' },
			chroma: { stops: [0, 0], interpolator: 'interpolatorLinear' },
		});
		const middle = rgbPalette.find(({ stop }) => stop === 500);
		const isInSrgb = inGamut('rgb');

		expect(rgbTarget.mode).toBe('rgb');
		expect(middle?.color.c).toBeCloseTo(convertedTarget.c);
		expect(middle?.color.h).toBeCloseTo(convertedTarget.h ?? 0);
		expect(rgbPalette.some(({ color }) => !isInSrgb(color))).toBe(true);
	});

	it('does not clamp unbounded input spaces such as OKLCH', () => {
		const middle = palette.find(({ stop }) => stop === 500);
		const isInSrgb = inGamut('rgb');

		expect(middle?.color.c).toBeCloseTo(0.2);
		expect(middle && isInSrgb(middle.color)).toBe(false);
	});

	it('distinguishes Rec. 2020 colors from colors beyond Rec. 2020', () => {
		const rec2020Color = oklch({ mode: 'rec2020', r: 0.99, g: 0.01, b: 0.01 });
		const unboundedColor = oklch('oklch(60% 0.7 20)');
		if (!unboundedColor) throw new Error('Invalid test color');

		expect(classifyGamut(rec2020Color)).toBe('rec2020');
		expect(classifyGamut(unboundedColor)).toBe('beyond-rec2020');
	});

	it('builds hue-chroma boundaries at a fixed lightness', () => {
		const map = createHueChromaMap(0.5);
		const [rec2020, displayP3, srgb] = map.boundaries;

		expect(rec2020?.points).toHaveLength(61);
		expect(displayP3?.points).toHaveLength(61);
		expect(srgb?.points).toHaveLength(61);
		for (const boundary of map.boundaries) {
			for (const point of boundary.points) {
				expect(point.hue).toBeGreaterThanOrEqual(0);
				expect(point.hue).toBeLessThanOrEqual(360);
				expect(point.chroma).toBeGreaterThan(0);
				expect(Number.isFinite(point.chroma)).toBe(true);
			}
		}
		expect(rec2020?.points).not.toEqual(displayP3?.points);
		expect(displayP3?.points).not.toEqual(srgb?.points);
	});
});
