<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import ErodedCheckerboard from './ErodedCheckerboard.svelte';

	type Args = ComponentProps<typeof ErodedCheckerboard>;

	const { Story } = defineMeta({
		title: 'Eroded Checkerboard',
		component: ErodedCheckerboard,
		args: {
			checkerSize: 8.72,
			pixelSize: 1,
			seed: 7,
			opacity: 0.03,
			maxErosion: 0.65,
			falloff: 3.5,
		},
		argTypes: {
			maxFieldWidth: { control: { type: 'range', min: 100, max: 1400, step: 10 } },
			maxFieldHeight: { control: { type: 'range', min: 100, max: 800, step: 10 } },
			checkerSize: { control: { type: 'range', min: 4, max: 32, step: 0.01 } },
			pixelSize: { control: { type: 'range', min: 0.5, max: 8, step: 0.25 } },
			seed: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			opacity: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
			maxErosion: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
			falloff: { control: { type: 'range', min: 0.25, max: 4, step: 0.01 } },
		},
		parameters: {
			layout: 'fullscreen',
		},
	});
</script>

{#snippet template(args: Args)}
	<div class="preview">
		<ErodedCheckerboard {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<style>
	.preview {
		box-sizing: border-box;
		inline-size: 100vw;
		block-size: 100vh;
		background: #050505;
	}
</style>
