// Design tokens

import { parse } from 'culori';
import { theme } from '@unocss/preset-wind4/theme';

import { createColorPalette, type ColorStop } from './ColorPalette/palette';

const primaryColor = parse('oklch(0.8925 0.2645 125.76)');
if (!primaryColor) throw new Error();

const secondaryColor = parse('#3600F7');
if (!secondaryColor) throw new Error();

const shadeColor = parse('#141414');
if (!shadeColor) throw new Error();

export const primaryPaletteConfig = {
	color: primaryColor,
	hue: {
		stops: [0, 0.0675, 0.09],
		interpolator: 'interpolatorSplineMonotone2',
	},
	chroma: {
		stops: [0, -0.06, -0.36, -0.6],
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

export const shadePaletteConfig = {
	color: shadeColor,
	hue: {
		stops: [0, 0],
		interpolator: 'interpolatorLinear',
	},
	chroma: {
		stops: [0, 0],
		interpolator: 'interpolatorLinear',
	},
} satisfies Parameters<typeof createColorPalette>[0];

const primaryPalette = createColorPalette(primaryPaletteConfig);
const secondaryPalette = createColorPalette(secondaryPaletteConfig);
const shadePalette = createColorPalette(shadePaletteConfig);

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
	shade: paletteRecord(shadePalette, ({ css }) => css),
} as const;

export const brandColors = {
	primary: paletteRecord(primaryPalette, ({ stop }) => `var(--brand-primary-${stop})`),
	secondary: paletteRecord(secondaryPalette, ({ stop }) => `var(--brand-secondary-${stop})`),
	shade: paletteRecord(shadePalette, ({ stop }) => `var(--brand-shade-${stop})`),
} as const;

export const buttonColorValues = {
	dark: {
		surface: brandColorValues.shade[900],
		content: brandColorValues.shade[50],
		hoverContent: brandColorValues.primary[50],
		disabledSurface: brandColorValues.shade[700],
		disabledContent: brandColorValues.shade[400],
	},
	light: {
		surface: brandColorValues.shade[50],
		content: brandColorValues.shade[900],
		hoverContent: brandColorValues.secondary[700],
		disabledSurface: brandColorValues.shade[300],
		disabledContent: brandColorValues.shade[600],
	},
	focusRing: brandColorValues.primary[800],
} as const;

export const buttonColors = {
	dark: {
		surface: brandColors.shade[900],
		content: brandColors.shade[50],
		hoverContent: brandColors.primary[50],
		disabledSurface: brandColors.shade[700],
		disabledContent: brandColors.shade[400],
	},
	light: {
		surface: brandColors.shade[50],
		content: brandColors.shade[900],
		hoverContent: brandColors.secondary[700],
		disabledSurface: brandColors.shade[300],
		disabledContent: brandColors.shade[600],
	},
	focusRing: brandColors.primary[800],
} as const;

export const buttonSizes = {
	default: {
		height: '2.5rem',
		inlinePadding: '0.5rem',
		sprayRadius: 6,
		spraySpread: 6,
	},
	large: {
		height: '3rem',
		inlinePadding: '1rem',
		sprayRadius: 8,
		spraySpread: 8,
	},
} as const;

export const fonts = {
	body: 'PP Neue Montreal',
	header: 'Redaction 35',
	art: 'Redaction 50',
} as const;

export type SizeName = string;
export type TextScale = Record<SizeName, { fontSize: string; lineHeight: string }>;
export const textScale: TextScale = theme.text;
