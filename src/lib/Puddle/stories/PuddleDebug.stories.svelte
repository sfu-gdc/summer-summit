<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { expect } from 'storybook/test';

	import { brandColorValues } from '$lib/tokens';

	import { resolvePuddleGeometry } from '../geometry';
	import Puddle from '../Puddle.svelte';
	import { paramSchema } from '../sim';
	import { createWaterSimConfig } from '../sim/facade/config';
	import { puddleStoryConfig } from './storyConfig';

	interface Args {
		backgroundColor: string;
		bowlAmp: number;
		bowlHeight: number;
		bowlRim: number;
		bowlWidth: number;
		cellSize: number;
		maxCells: number;
		noiseAmp: number;
		noiseFreq: number;
		seed: number;
	}

	interface TerrainCell {
		depth: number;
		index: number;
		x: number;
		y: number;
	}

	interface TerrainDepth {
		cells: TerrainCell[];
		columns: number;
		maximum: number;
		minimum: number;
		rows: number;
	}

	const width = 1200;
	const height = 720;
	const terrainControls = [
		'cellSize',
		'seed',
		'noiseAmp',
		'noiseFreq',
		'bowlWidth',
		'bowlHeight',
		'bowlAmp',
		'bowlRim',
		'maxCells',
	];

	function renderTerrainDepth(args: Args): TerrainDepth {
		const geometry = resolvePuddleGeometry(width, height, {
			cellSize: args.cellSize,
			maxCells: args.maxCells,
		});
		const config = createWaterSimConfig(
			{
				nx: geometry.cols,
				ny: geometry.rows,
				seed: args.seed,
				noiseAmp: args.noiseAmp,
				noiseFreq: args.noiseFreq,
				bowlHalfX: args.bowlWidth / width / 2,
				bowlHalfY: args.bowlHeight / height / 2,
				bowlAmp: args.bowlAmp,
				bowlRim: args.bowlRim,
			},
			{ x: 0, y: 0 },
		);
		const terrain = config.engine.terrain;
		let minimum = Number.POSITIVE_INFINITY;
		let maximum = Number.NEGATIVE_INFINITY;

		for (const elevation of terrain) {
			minimum = Math.min(minimum, elevation);
			maximum = Math.max(maximum, elevation);
		}

		const range = Math.max(Number.EPSILON, maximum - minimum);
		const cells = Array.from(terrain, (elevation, index) => ({
			depth: (maximum - elevation) / range,
			index,
			x: index % geometry.cols,
			y: Math.floor(index / geometry.cols),
		}));

		return { cells, columns: geometry.cols, maximum, minimum, rows: geometry.rows };
	}

	function depthColor(depth: number): string {
		const hue = 50 + depth * 170;
		const lightness = 70 - depth * 35;
		return `hsl(${hue.toString()} 90% ${lightness.toString()}%)`;
	}

	const { Story } = defineMeta<typeof template, typeof Puddle>({
		title: 'Puddle/Debug',
		component: Puddle,
		args: {
			...puddleStoryConfig.args,
			backgroundColor: brandColorValues.shade['900'],
			bowlAmp: paramSchema.bowlAmp.default,
			bowlRim: paramSchema.bowlRim.default,
			noiseFreq: paramSchema.noiseFreq.default,
		},
		argTypes: {
			...puddleStoryConfig.argTypes,
			backgroundColor: { control: 'color' },
			bowlAmp: {
				control: {
					type: 'range',
					min: paramSchema.bowlAmp.min,
					max: paramSchema.bowlAmp.max,
					step: 0.1,
				},
			},
			bowlRim: {
				control: {
					type: 'range',
					min: paramSchema.bowlRim.min,
					max: paramSchema.bowlRim.max,
					step: 0.01,
				},
			},
			noiseFreq: {
				control: {
					type: 'range',
					min: paramSchema.noiseFreq.min,
					max: paramSchema.noiseFreq.max,
					step: 0.1,
				},
			},
		},
		parameters: {
			layout: 'fullscreen',
			controls: { include: [...terrainControls, 'backgroundColor'] },
		},
	});
</script>

{#snippet template(args: Args)}
	{@const terrain = renderTerrainDepth(args)}
	<div
		class="bg-[var(--story-background-color)] h-screen w-screen relative overflow-hidden"
		style:--story-background-color={args.backgroundColor}
	>
		<svg
			class="h-full w-full block [shape-rendering:crispEdges]"
			viewBox={`0 0 ${terrain.columns.toString()} ${terrain.rows.toString()}`}
			preserveAspectRatio="none"
			data-terrain-depth
			aria-label="Terrain depth heatmap"
			role="img"
		>
			{#each terrain.cells as cell (cell.index)}
				<rect
					x={cell.x}
					y={cell.y}
					width="1"
					height="1"
					fill={depthColor(cell.depth)}
					data-depth={cell.depth}
				></rect>
			{/each}
		</svg>
		<div
			class="text-sm text-white font-mono p-4 rounded bg-black/80 gap-2 grid bottom-6 left-6 absolute"
		>
			<strong>Terrain depth</strong>
			<div class="bg-[linear-gradient(to_right,hsl(50_90%_70%),hsl(220_90%_35%))] h-3 w-56"></div>
			<div class="flex gap-8 justify-between">
				<span>high {terrain.maximum.toFixed(2)}</span>
				<span>deep {terrain.minimum.toFixed(2)}</span>
			</div>
			<span>{terrain.columns} × {terrain.rows} cells</span>
		</div>
	</div>
{/snippet}

<Story
	name="Terrain Depth"
	{template}
	play={async ({ canvasElement }) => {
		const heatmap = canvasElement.querySelector('[data-terrain-depth]');
		await expect(heatmap).not.toBeNull();
		await expect(heatmap?.querySelectorAll('rect').length).toBeGreaterThan(0);
	}}
/>
