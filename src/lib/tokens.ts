// Design tokens

import { parse } from 'culori';
import { theme } from '@unocss/preset-wind4/theme';

import { createColorPalette, type ColorStop } from './ColorPalette/palette';

const primaryColor = parse('#C7FF00');
if (!primaryColor) throw new Error();

const secondaryColor = parse('#3600F7');
if (!secondaryColor) throw new Error();

export const primaryPaletteConfig = {
	color: primaryColor,
	hue: {
		stops: [0, 0.0675, 0.09],
		interpolator: 'interpolatorSplineMonotone2',
	},
	chroma: {
		stops: [0.04, -0.06, -0.36],
		interpolator: 'interpolatorSplineMonotone2',
	},
} satisfies Parameters<typeof createColorPalette>[0];

export const secondaryPaletteConfig = {
	color: secondaryColor,
	hue: {
		stops: [0.08, 0.04, 0, -0.08],
		interpolator: 'interpolatorSplineMonotone2',
	},
	chroma: {
		stops: [-0.7, -0.37, -0.18, 0, -0.6, -0.63],
		interpolator: 'interpolatorSplineMonotone2',
	},
} satisfies Parameters<typeof createColorPalette>[0];

const primaryPalette = createColorPalette(primaryPaletteConfig);
const secondaryPalette = createColorPalette(secondaryPaletteConfig);

function paletteRecord(
	value: typeof primaryPalette,
	select: (swatch: (typeof primaryPalette)[number]) => string,
): Record<ColorStop, string> {
	return Object.fromEntries(value.map((swatch) => [swatch.stop, select(swatch)])) as Record<
		ColorStop,
		string
	>;
}

export const brandColorValues = {
	primary: paletteRecord(primaryPalette, ({ css }) => css),
	secondary: paletteRecord(secondaryPalette, ({ css }) => css),
} as const;

export const brandColors = {
	primary: paletteRecord(primaryPalette, ({ stop }) => `var(--brand-primary-${stop})`),
	secondary: paletteRecord(secondaryPalette, ({ stop }) => `var(--brand-secondary-${stop})`),
} as const;

export const fonts = {
	sans: 'Work Sans Variable',
	hero: 'Syncopate',
} as const;

export type SizeName = string;
export type TextScale = Record<SizeName, { fontSize: string; lineHeight: string }>;
export const textScale: TextScale = theme.text;
