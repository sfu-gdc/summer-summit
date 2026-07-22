<script lang="ts">
	import { formatCss, type Oklch } from 'culori';

	import {
		createHueChromaMap,
		gamutLabels,
		type ColorGamut,
		type DisplayGamut,
		type GamutBoundaryPoint,
	} from './gamutMap';

	interface Props {
		color: Oklch;
		gamut: ColorGamut;
		label: string;
	}

	const WIDTH = 180;
	const HEIGHT = 88;
	const PLOT = { left: 9, right: 176, top: 5, bottom: 77 } as const;
	const DEFAULT_MAX_CHROMA = 0.5;
	const gamutRank: Record<ColorGamut, number> = {
		srgb: 0,
		'display-p3': 1,
		rec2020: 2,
		'beyond-rec2020': 3,
	};

	let { color, gamut, label }: Props = $props();
	const uid = $props.id();
	const map = $derived(createHueChromaMap(color.l));
	const maximumChroma = $derived(Math.max(DEFAULT_MAX_CHROMA, color.c * 1.08));
	const markerHue = $derived(color.h ?? 180);
	const markerX = $derived(xForHue(markerHue));
	const markerY = $derived(yForChroma(color.c, maximumChroma));
	const markerCss = $derived(formatCss(color));
	const title = $derived(
		`${label} hue–chroma map at ${Math.round(color.l * 100)}% lightness. ` +
			`${color.h === undefined ? 'Neutral color' : `Hue ${color.h.toFixed(1)} degrees`}, ` +
			`chroma ${color.c.toFixed(3)}, ${gamutLabels[gamut]}.`,
	);

	function xForHue(hue: number): number {
		return PLOT.left + (hue / 360) * (PLOT.right - PLOT.left);
	}

	function yForChroma(chroma: number, scale: number): number {
		return PLOT.bottom - (chroma / scale) * (PLOT.bottom - PLOT.top);
	}

	function linePath(points: GamutBoundaryPoint[], scale: number): string {
		return points
			.map(
				({ hue, chroma }, index) =>
					`${index === 0 ? 'M' : 'L'} ${xForHue(hue).toFixed(2)} ${yForChroma(chroma, scale).toFixed(2)}`,
			)
			.join(' ');
	}

	function areaPath(points: GamutBoundaryPoint[], scale: number): string {
		return `${linePath(points, scale)} L ${PLOT.right} ${PLOT.bottom} L ${PLOT.left} ${PLOT.bottom} Z`;
	}

	function fieldOpacity(field: DisplayGamut, colorGamut: ColorGamut): number {
		if (gamutRank[field] <= gamutRank[colorGamut]) return 1;
		return field === 'rec2020' ? 0.14 : 0.26;
	}
</script>

<div class="minimap">
	<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${uid}-title`}>
		<title id={`${uid}-title`}>{title}</title>
		<defs>
			<linearGradient id={`${uid}-hues`} x1="0" y1="0" x2="1" y2="0">
				{#each map.gradientStops as stop (stop.hue)}
					<stop offset={`${(stop.hue / 360) * 100}%`} stop-color={stop.css} />
				{/each}
			</linearGradient>
			<linearGradient id={`${uid}-neutral`} x1="0" y1="1" x2="0" y2="0">
				<stop offset="0%" stop-color={map.neutralCss} stop-opacity="0.96" />
				<stop offset="100%" stop-color={map.neutralCss} stop-opacity="0" />
			</linearGradient>
		</defs>

		<line class="guide boundary" x1={PLOT.left} x2={PLOT.right} y1={PLOT.top} y2={PLOT.top} />
		<line class="axis" x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} />
		<line class="axis" x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} />

		{#each map.boundaries as boundary (boundary.gamut)}
			<g style:opacity={fieldOpacity(boundary.gamut, gamut)}>
				<path d={areaPath(boundary.points, maximumChroma)} fill={`url(#${uid}-hues)`} />
				<path d={areaPath(boundary.points, maximumChroma)} fill={`url(#${uid}-neutral)`} />
			</g>
		{/each}

		{#each map.boundaries as boundary (boundary.gamut)}
			<path
				class="gamut-boundary"
				class:larger={gamutRank[boundary.gamut] > gamutRank[gamut]}
				class:smaller={gamutRank[boundary.gamut] < gamutRank[gamut]}
				d={linePath(boundary.points, maximumChroma)}
			/>
		{/each}

		<line class="crosshair" x1={PLOT.left} x2={PLOT.right} y1={markerY} y2={markerY} />
		{#if color.h !== undefined}
			<line class="crosshair" x1={markerX} x2={markerX} y1={PLOT.top} y2={PLOT.bottom} />
		{/if}
		<circle class="marker-ring" cx={markerX} cy={markerY} r="3.25" />
		<circle class="marker" cx={markerX} cy={markerY} r="2.1" fill={markerCss} />

		<text class="axis-label chroma-label" x="2.5" y={(PLOT.top + PLOT.bottom) / 2}>C</text>
		<text class="axis-label" x={PLOT.right - 1} y={HEIGHT - 2}>H</text>
	</svg>

	<div class="legend" aria-hidden="true">
		{#each map.boundaries.toReversed() as boundary (boundary.gamut)}
			<span class:larger={gamutRank[boundary.gamut] > gamutRank[gamut]}>{boundary.label}</span>
		{/each}
	</div>
</div>

<style>
	.minimap {
		position: relative;
		min-inline-size: 0;
		aspect-ratio: 2 / 1;
		overflow: hidden;
		background: color-mix(in oklab, currentColor 7%, transparent);
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		border-radius: 0.3rem;
	}

	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.axis,
	.guide,
	.gamut-boundary,
	.crosshair,
	.marker-ring {
		vector-effect: non-scaling-stroke;
	}

	.axis {
		stroke: currentColor;
		stroke-opacity: 0.24;
		stroke-width: 0.6;
	}

	.guide {
		stroke: currentColor;
		stroke-dasharray: 1.5 2;
		stroke-opacity: 0.18;
		stroke-width: 0.5;
	}

	.gamut-boundary {
		fill: none;
		stroke: color-mix(in oklab, currentColor 82%, transparent);
		stroke-width: 0.65;
	}

	.gamut-boundary.larger {
		stroke-opacity: 0.35;
	}

	.gamut-boundary.smaller {
		stroke-dasharray: 2 1.5;
	}

	.crosshair {
		stroke: currentColor;
		stroke-opacity: 0.38;
		stroke-width: 0.55;
	}

	.marker-ring {
		fill: none;
		stroke: color-mix(in oklab, currentColor 90%, black 10%);
		stroke-width: 1.2;
	}

	.marker {
		stroke: white;
		stroke-width: 0.45;
		vector-effect: non-scaling-stroke;
	}

	.axis-label {
		fill: currentColor;
		fill-opacity: 0.48;
		font-size: 5px;
		font-weight: 700;
		text-anchor: end;
	}

	.chroma-label {
		dominant-baseline: middle;
		text-anchor: middle;
	}

	.legend {
		position: absolute;
		inset-block-start: 0.18rem;
		inset-inline-end: 0.22rem;
		display: flex;
		gap: 0.18rem;
		padding: 0.08rem 0.14rem;
		background: color-mix(in oklab, canvas 70%, transparent);
		border-radius: 0.15rem;
		font-size: 0.42rem;
		font-weight: 650;
		letter-spacing: 0.02em;
		line-height: 1.2;
	}

	.legend .larger {
		opacity: 0.34;
	}
</style>
