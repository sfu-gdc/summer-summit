import { formatCss, parse, toGamut, type Color } from 'culori';

const fallbackColor = { mode: 'rgb', r: 0.08, g: 0.08, b: 0.08 } as const satisfies Color;
const mapToP3 = toGamut('p3', 'oklch');
const mapToSrgb = toGamut('rgb', 'oklch');

export interface PuddleCssColors {
	readonly srgb: string;
	readonly p3: string;
}

export function resolvePuddleCssColors(color: string | Color): PuddleCssColors {
	// Keep the source mode until each output path selects its supported gamut.
	const source = typeof color === 'string' ? (parse(color) ?? fallbackColor) : { ...color };
	return {
		srgb: formatCss(mapToSrgb(source)),
		p3: formatCss(mapToP3(source)),
	};
}
