import {
	formatCss,
	formatHex,
	interpolatorLinear,
	interpolatorSplineBasis,
	interpolatorSplineBasisClosed,
	interpolatorSplineMonotone,
	interpolatorSplineMonotone2,
	interpolatorSplineMonotoneClosed,
	interpolatorSplineNatural,
	interpolatorSplineNaturalClosed,
	oklch,
	type Color,
	type Oklch,
} from 'culori';

import { classifyGamut, type ColorGamut } from './gamutMap';

export const standardColorStops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ColorStop = (typeof standardColorStops)[number];

export const interpolatorNames = [
	'interpolatorLinear',
	'interpolatorSplineBasis',
	'interpolatorSplineBasisClosed',
	'interpolatorSplineNatural',
	'interpolatorSplineNaturalClosed',
	'interpolatorSplineMonotone',
	'interpolatorSplineMonotone2',
	'interpolatorSplineMonotoneClosed',
] as const;

export type InterpolatorName = (typeof interpolatorNames)[number];

export interface OffsetInterpolation {
	/** Evenly spaced normalized offsets from the lightest stop to the dimmest stop. */
	stops: readonly number[];
	interpolator: InterpolatorName;
}

export interface PaletteConfig {
	color: Color;
	hue: OffsetInterpolation;
	chroma: OffsetInterpolation;
}

export interface PaletteSwatch {
	stop: ColorStop;
	gamut: ColorGamut;
	color: Oklch;
	css: string;
	/** An sRGB fallback for browsers without CSS Color 4 support. */
	hex: string;
}

const LIGHTEST_STOP = standardColorStops[0];
const DIMMEST_STOP = standardColorStops.at(-1) ?? 950;
const FULL_HUE_TURN = 360;
const OKLCH_FULL_CHROMA = 0.4;

const interpolators = {
	interpolatorLinear,
	interpolatorSplineBasis,
	interpolatorSplineBasisClosed,
	interpolatorSplineNatural,
	interpolatorSplineNaturalClosed,
	interpolatorSplineMonotone,
	interpolatorSplineMonotone2,
	interpolatorSplineMonotoneClosed,
} satisfies Record<InterpolatorName, (values: number[]) => (progress: number) => number>;

function wrapHue(hue: number): number {
	return ((hue % 360) + 360) % 360;
}

function createOffsetInterpolator(config: OffsetInterpolation): (progress: number) => number {
	if (config.stops.length < 2) {
		throw new RangeError('Offset interpolation requires at least two stops');
	}
	if (!config.stops.every(Number.isFinite)) {
		throw new RangeError('Offset interpolation stops must be finite numbers');
	}

	return interpolators[config.interpolator]([...config.stops]);
}

export function createColorPalette(config: PaletteConfig): PaletteSwatch[] {
	const { color: targetColor, hue: hueOffset, chroma: chromaOffset } = config;
	const target = oklch(targetColor);
	const interpolateHueOffset = createOffsetInterpolator(hueOffset);
	const interpolateChromaOffset = createOffsetInterpolator(chromaOffset);

	return standardColorStops.map((stop) => {
		const progress = (stop - LIGHTEST_STOP) / (DIMMEST_STOP - LIGHTEST_STOP);
		const normalizedHueOffset = interpolateHueOffset(progress);
		const normalizedChromaOffset = interpolateChromaOffset(progress);
		const hue = target.h;
		const color: Oklch = {
			mode: 'oklch',
			l: 1 - stop / 1000,
			c: Math.max(0, target.c + normalizedChromaOffset * OKLCH_FULL_CHROMA),
			...(hue === undefined ? {} : { h: wrapHue(hue + normalizedHueOffset * FULL_HUE_TURN) }),
			...(target.alpha === undefined ? {} : { alpha: target.alpha }),
		};
		return {
			stop,
			gamut: classifyGamut(color),
			color,
			css: formatCss(color),
			hex: formatHex(color),
		};
	});
}
