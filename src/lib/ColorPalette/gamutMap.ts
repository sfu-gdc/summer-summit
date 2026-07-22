import { formatCss, inGamut, type Mode, type Oklch } from 'culori';

export type ColorGamut = 'srgb' | 'display-p3' | 'rec2020' | 'beyond-rec2020';
export type DisplayGamut = Exclude<ColorGamut, 'beyond-rec2020'>;

export interface GamutBoundaryPoint {
	hue: number;
	chroma: number;
}

export interface GamutBoundary {
	gamut: DisplayGamut;
	label: string;
	points: GamutBoundaryPoint[];
}

export interface HueGradientStop extends GamutBoundaryPoint {
	css: string;
}

export interface HueChromaMap {
	boundaries: GamutBoundary[];
	gradientStops: HueGradientStop[];
	neutralCss: string;
}

export const gamutLabels: Record<ColorGamut, string> = {
	srgb: 'sRGB',
	'display-p3': 'P3',
	rec2020: 'Rec. 2020',
	'beyond-rec2020': 'Beyond Rec. 2020',
};

const boundaryDefinitions = [
	{ gamut: 'rec2020', label: gamutLabels.rec2020, mode: 'rec2020' },
	{ gamut: 'display-p3', label: gamutLabels['display-p3'], mode: 'p3' },
	{ gamut: 'srgb', label: gamutLabels.srgb, mode: 'rgb' },
] as const satisfies readonly { gamut: DisplayGamut; label: string; mode: Mode }[];

const gamutChecks = {
	srgb: inGamut('rgb'),
	'display-p3': inGamut('p3'),
	rec2020: inGamut('rec2020'),
} satisfies Record<DisplayGamut, ReturnType<typeof inGamut>>;

const HUE_STEP = 6;
const GRADIENT_STEP = 30;
const SEARCH_LIMIT = 0.8;
const SEARCH_STEPS = 12;
const mapCache = new Map<number, HueChromaMap>();

export function classifyGamut(color: Oklch): ColorGamut {
	if (gamutChecks.srgb(color)) return 'srgb';
	if (gamutChecks['display-p3'](color)) return 'display-p3';
	if (gamutChecks.rec2020(color)) return 'rec2020';
	return 'beyond-rec2020';
}

function maximumChroma(lightness: number, hue: number, mode: Mode): number {
	const contains = inGamut(mode);
	let lower = 0;
	let upper = 0.1;

	while (upper < SEARCH_LIMIT && contains({ mode: 'oklch', l: lightness, c: upper, h: hue })) {
		lower = upper;
		upper = Math.min(upper * 2, SEARCH_LIMIT);
	}

	if (upper === SEARCH_LIMIT && contains({ mode: 'oklch', l: lightness, c: upper, h: hue })) {
		return upper;
	}

	for (let index = 0; index < SEARCH_STEPS; index += 1) {
		const candidate = (lower + upper) / 2;
		if (contains({ mode: 'oklch', l: lightness, c: candidate, h: hue })) {
			lower = candidate;
		} else {
			upper = candidate;
		}
	}

	return lower;
}

export function createHueChromaMap(lightness: number): HueChromaMap {
	const cacheKey = Math.round(lightness * 1_000_000);
	const cached = mapCache.get(cacheKey);
	if (cached) return cached;

	const boundaries = boundaryDefinitions.map(({ gamut, label, mode }) => ({
		gamut,
		label,
		points: Array.from({ length: 360 / HUE_STEP + 1 }, (_, index) => {
			const hue = index * HUE_STEP;
			return { hue, chroma: maximumChroma(lightness, hue, mode) };
		}),
	}));
	const rec2020Boundary = boundaries[0];
	if (!rec2020Boundary) throw new Error('Missing Rec. 2020 gamut boundary');
	const gradientStops = rec2020Boundary.points
		.filter(({ hue }) => hue % GRADIENT_STEP === 0)
		.map(({ hue, chroma }) => ({
			hue,
			chroma,
			css: formatCss({ mode: 'oklch', l: lightness, c: chroma, h: hue }),
		}));
	const map = {
		boundaries,
		gradientStops,
		neutralCss: formatCss({ mode: 'oklch', l: lightness, c: 0, h: 0 }),
	};

	mapCache.set(cacheKey, map);
	return map;
}
