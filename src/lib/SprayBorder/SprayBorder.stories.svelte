<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect } from 'storybook/test';

	import { brandColorValues } from '$lib/tokens';

	import SprayBorder from './SprayBorder.svelte';

	type Args = ComponentProps<typeof SprayBorder>;

	const nextFrame = () =>
		new Promise((r) => void requestAnimationFrame(() => void requestAnimationFrame(r)));

	// WebGL2 is absent in some headless runners; only assert pixels where it exists.
	const hasWebGL2 = () => Boolean(document.createElement('canvas').getContext('webgl2'));

	function paintedPixels(canvas: HTMLCanvasElement): number {
		const ctx = canvas.getContext('2d', {
			willReadFrequently: true,
		});
		if (!ctx || canvas.width === 0 || canvas.height === 0) return 0;
		const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		let n = 0;
		for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++; // check if alpha channel is non-zero for each pixel
		return n;
	}

	const { Story } = defineMeta({
		title: 'SprayBorder',
		component: SprayBorder,
		args: {
			spread: 8,
			radius: 9,
			density: 1,
			seed: 7,
			color: brandColorValues.primary['800'],
		},
		argTypes: {
			spread: { control: { type: 'range', min: 4, max: 40, step: 1 } },
			radius: { control: { type: 'range', min: 0, max: 40, step: 1 } },
			density: { control: { type: 'range', min: 0.3, max: 2, step: 0.05 } },
			seed: { control: { type: 'range', min: 1, max: 40, step: 1 } },
			color: { control: 'color' },
		},
		parameters: {
			controls: { include: ['spread', 'radius', 'density', 'seed', 'color'] },
			docs: { argTypes: { include: ['spread', 'radius', 'density', 'seed', 'color'] } },
		},
	});
</script>

<!-- SprayBorder is the sized, positioned host itself; the outer padding just gives the bleed room to show. -->
{#snippet template(args: Args)}
	<div class="p-12">
		<SprayBorder
			{...args}
			class="text-white tracking-wider font-bold font-sans px-5 inline-flex h-14 uppercase items-center justify-center"
			><span>Spray border</span></SprayBorder
		>
	</div>
{/snippet}

<Story
	name="Default"
	{template}
	play={async ({ canvasElement }) => {
		const canvas = canvasElement.querySelector('canvas');
		await expect(canvas).not.toBeNull();
		if (!canvas) return;
		for (let i = 0; i < 30; i++) {
			if (paintedPixels(canvas) > 0) break;
			await nextFrame();
		}
		// Where WebGL2 is available the spray must actually blit; otherwise just no-op.
		if (hasWebGL2()) await expect(paintedPixels(canvas)).toBeGreaterThan(0);
		else await expect(canvas).toBeTruthy();
	}}
/>
