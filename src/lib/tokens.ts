// Design tokens

import { theme } from '@unocss/preset-wind4/theme';
import { interpolate, interpolatorSplineMonotone2, formatCss, oklch } from 'culori';

const colorStops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export const brand = {
	primary: {
		50: 'oklch(95.20% 0.0250 283.50)',
		100: 'oklch(90.03% 0.0551 283.77)',
		225: 'oklch(75.03% 0.1465 285.63)',
		375: 'oklch(63.78% 0.2218 286.67)',
		500: 'oklch(51.20% 0.2529 286.36)',
		625: 'oklch(37.27% 0.1841 286.40)',
		775: 'oklch(24.11% 0.1192 286.50)',
		950: 'oklch(9.93% 0.0465 288.17)',
	},
	secondary: {
		50: 'oklch(90.50% 0.1300 122.90)',
		100: 'oklch(82.70% 0.2088 122.87)',
		225: 'oklch(75.82% 0.2039 122.84)',
		500: 'oklch(51.03% 0.1695 122.65)',
		950: 'oklch(23.41% 0.0631 123.86)',
	},
	shade: {
		50: 'oklch(95.30% 0.0060 271.00)',
		100: 'oklch(90.11% 0.0108 271.21)',
		225: 'oklch(76.62% 0.0319 272.63)',
		375: 'oklch(63.50% 0.0518 271.60)',
		500: 'oklch(51.67% 0.0714 272.43)',
		950: 'oklch(13.12% 0.0157 283.23)',
	},
} as const;

type ColorScale = Record<(typeof colorStops)[number], string>;

// Shadow-shaping knob, one per ramp. The `brand` anchors stay the source of
// truth; this reshapes only the darker half of each ramp, holding the midpoint
// lightness and everything above it (plus all chroma/hue) fixed. 1 = authored
// shadows untouched; >1 deepens shadows, <1 lifts them. Tweak to taste.
const shadowGamma = {
	primary: 0.6,
	secondary: 0.6,
	shade: 0.6,
} as const;

// Reshape a ramp's shadows on a gamma curve, pivoting at the midpoint lightness
// so the upper half stays exactly as authored.
function shapeShadows(colors: Record<number, string>, gamma: number): Record<number, string> {
	const parsed = Object.entries(colors).map(([stop, color]) => {
		const c = oklch(color);
		if (!c) throw new Error(`unparseable color: ${color}`);
		return [Number(stop), c] as const;
	});
	const lightnesses = parsed.map(([, c]) => c.l);
	const dark = Math.min(...lightnesses);
	const span = Math.max(...lightnesses) - dark;
	return Object.fromEntries(
		parsed.map(([stop, c]) => {
			const p = span === 0 ? 0 : (c.l - dark) / span;
			if (p >= 0.5) return [stop, formatCss(c)];
			// remap within the lower half, pinning both the black point and midpoint
			const l = dark + span * 0.5 * (p / 0.5) ** gamma;
			return [stop, formatCss({ ...c, l })];
		}),
	);
}

// Expand a hand-picked ramp into a full 10-stop scale.
function generateColors(colors: Record<number, string>): ColorScale {
	const stops = Object.entries(colors).map(
		([key, color]) => [color, Number(key) / 1000] as [string, number],
	);
	const interpolator = interpolate(
		stops,
		'oklch',
		// @ts-expect-error - bad types
		interpolatorSplineMonotone2,
	);

	return Object.fromEntries(
		colorStops.map((stop) => [stop, formatCss(interpolator(stop / 1000))]),
	) as ColorScale;
}

export const brandColors = {
	primary: generateColors(shapeShadows(brand.primary, shadowGamma.primary)),
	secondary: generateColors(shapeShadows(brand.secondary, shadowGamma.secondary)),
	shade: generateColors(shapeShadows(brand.shade, shadowGamma.shade)),
};

export const fonts = {
	sans: 'Work Sans Variable',
	hero: 'Syncopate',
} as const;

export type SizeName = string;
export type TextScale = Record<SizeName, { fontSize: string; lineHeight: string }>;
export const textScale: TextScale = theme.text;

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe('generateColors', () => {
		const ramps = Object.entries(brand) as [string, Record<number, string>][];
		// Narrow away culori's `| undefined` so downstream reads are non-nullable.
		const parse = (color: string) => {
			const parsed = oklch(color);
			if (!parsed) throw new Error(`unparseable color: ${color}`);
			return parsed;
		};

		it.each(ramps)('preserves %s anchors that coincide with output stops', (_, ramp) => {
			const scale = generateColors(ramp);
			for (const stop of colorStops) {
				const anchor = ramp[stop];
				if (anchor === undefined) continue;
				const got = parse(scale[stop]);
				const want = parse(anchor);
				expect(got.l).toBeCloseTo(want.l, 5);
				expect(got.c).toBeCloseTo(want.c, 5);
				expect(got.h ?? 0).toBeCloseTo(want.h ?? 0, 3);
			}
		});

		it.each(ramps)('ramps %s from light to dark monotonically', (_, ramp) => {
			const scale = generateColors(ramp);
			const lightness = colorStops.map((stop) => parse(scale[stop]).l);
			const descending = lightness.every((l, i) => i === 0 || l < (lightness[i - 1] ?? Infinity));
			expect(descending).toBe(true);
		});
	});
}
