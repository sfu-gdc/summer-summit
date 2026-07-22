<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { formatHex, parse, type Color } from 'culori';

	import { primaryPaletteConfig, secondaryPaletteConfig } from '../tokens';
	import ColorPalette from './ColorPalette.svelte';
	import {
		createColorPalette,
		interpolatorNames,
		type InterpolatorName,
		type PaletteConfig,
	} from './palette';

	interface Args {
		color: string;
		hueStops: number[];
		hueInterpolator: InterpolatorName;
		chromaStops: number[];
		chromaInterpolator: InterpolatorName;
		label: string;
	}

	function parseStoryColor(value: string): Color {
		return parse(value) ?? { mode: 'rgb', r: 79 / 255, g: 24 / 255, b: 238 / 255 };
	}

	function createStoryColors(args: Args): Color[] {
		return createColorPalette({
			color: parseStoryColor(args.color),
			hue: {
				stops: args.hueStops,
				interpolator: args.hueInterpolator,
			},
			chroma: {
				stops: args.chromaStops,
				interpolator: args.chromaInterpolator,
			},
		}).map(({ color }) => color);
	}

	function createStoryArgs(config: PaletteConfig, label: string): Args {
		return {
			color: formatHex(config.color),
			hueStops: [...config.hue.stops],
			hueInterpolator: config.hue.interpolator,
			chromaStops: [...config.chroma.stops],
			chromaInterpolator: config.chroma.interpolator,
			label,
		};
	}

	const primaryArgs = createStoryArgs(primaryPaletteConfig, 'Primary');
	const secondaryArgs = createStoryArgs(secondaryPaletteConfig, 'Secondary');

	const { Story } = defineMeta({
		title: 'Color Palette',
		component: ColorPalette,
		render: template,
		argTypes: {
			color: {
				name: 'Target',
				control: { type: 'color' },
				table: { category: 'Color' },
			},
			hueStops: {
				name: 'Stops',
				description: 'Evenly spaced normalized offsets from the lightest to dimmest color.',
				control: { type: 'object' },
				table: { category: 'Hue offset' },
			},
			hueInterpolator: {
				name: 'Interpolator',
				options: interpolatorNames,
				control: { type: 'select' },
				table: { category: 'Hue offset' },
			},
			chromaStops: {
				name: 'Stops',
				description: 'Evenly spaced normalized offsets from the lightest to dimmest color.',
				control: { type: 'object' },
				table: { category: 'Chroma offset' },
			},
			chromaInterpolator: {
				name: 'Interpolator',
				options: interpolatorNames,
				control: { type: 'select' },
				table: { category: 'Chroma offset' },
			},
		},
		args: primaryArgs,
		parameters: {
			controls: {
				exclude: ['colors', 'class'],
			},
		},
	});
</script>

{#snippet template(args: Args)}
	<ColorPalette colors={createStoryColors(args)} label={args.label} />
{/snippet}

<Story name="Primary" />
<Story name="Secondary" args={secondaryArgs} />
