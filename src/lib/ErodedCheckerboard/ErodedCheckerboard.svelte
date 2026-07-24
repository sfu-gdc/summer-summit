<script module lang="ts">
	export interface ErodedCheckerboardProps {
		/** Maximum width of the centered radial erosion field, in CSS pixels. */
		maxFieldWidth?: number | undefined;
		/** Maximum height of the centered radial erosion field, in CSS pixels. */
		maxFieldHeight?: number | undefined;
		/** Size of each checker square, in CSS pixels. */
		checkerSize?: number | undefined;
		/** Size of each erosion rank, in CSS pixels. */
		pixelSize?: number | undefined;
		seed?: number | undefined;
		opacity?: number | undefined;
		/** Maximum progress of the four simultaneous corner-erosion fronts. */
		maxErosion?: number | undefined;
		/** Exponent applied to radial distance; larger values flatten the field near its center. */
		falloff?: number | undefined;
		class?: string | undefined;
	}
</script>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { createErodedCheckerboardRenderer } from './erodedCheckerboardRenderer';

	let {
		maxFieldWidth,
		maxFieldHeight,
		checkerSize = 8.72,
		pixelSize = 1,
		seed = 7,
		opacity = 0.03,
		maxErosion = 0.65,
		falloff = 3.5,
		class: className,
	}: ErodedCheckerboardProps = $props();

	let width = $state(0);
	let height = $state(0);

	const renderCheckerboard: Attachment<HTMLCanvasElement> = (canvas) => {
		const renderer = createErodedCheckerboardRenderer(canvas);
		if (!renderer) return;

		$effect(() => {
			if (width === 0 || height === 0) return;

			renderer.render({
				width,
				height,
				devicePixelRatio: devicePixelRatio.current ?? 1,
				maxFieldWidth,
				maxFieldHeight,
				checkerSize,
				pixelSize,
				seed,
				opacity,
				maxErosion,
				falloff,
			});
		});

		return renderer.destroy;
	};
</script>

<canvas
	class={['block h-full w-full pointer-events-none', className]}
	aria-hidden="true"
	bind:clientWidth={width}
	bind:clientHeight={height}
	{@attach renderCheckerboard}
></canvas>
