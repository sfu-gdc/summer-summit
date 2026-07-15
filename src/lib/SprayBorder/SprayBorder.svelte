<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { type Color, parse } from 'culori';

	import { browser } from '$app/environment';

	import { renderSpray } from './sprayRenderer';

	type Props = SvelteHTMLElements['div'] & {
		children?: Snippet | undefined;
		/** How far, in CSS px, the spray bleeds past the box. */
		spread?: number | undefined;
		radius?: number | undefined;
		density?: number | undefined;
		seed?: number | undefined;
		/** Any CSS color string or culori Color object */
		color: string | Color;
	};

	const {
		children,
		spread = 12,
		radius = 8,
		density = 1,
		seed = 7,
		color,
		...rest
	}: Props = $props();

	const colorObj = $derived(parse(color));

	let canvas = $state<HTMLCanvasElement | null>(null);
	let wrapperHeight: number = $state(0);
	let wrapperWidth: number = $state(0);

	$effect(() => {
		if (!browser || !canvas || wrapperWidth === 0 || wrapperHeight === 0) return;
		if (!colorObj) {
			console.warn('<SprayBorder> invalid color', color);
			return;
		}
		renderSpray(canvas, {
			cssW: wrapperWidth,
			cssH: wrapperHeight,
			dpr: devicePixelRatio.current ?? 1,
			spread,
			radius,
			density,
			seed,
			color: colorObj,
		});
	});
</script>

<div bind:offsetHeight={wrapperHeight} bind:offsetWidth={wrapperWidth} class="wrapper" {...rest}>
	<canvas bind:this={canvas} aria-hidden="true" style:--spread="{spread}px" class="renderer"
	></canvas>
	{@render children?.()}
</div>

<style>
	.wrapper {
		position: relative;
		display: inline-block;
		isolation: isolate;
	}

	.renderer {
		position: absolute;
		display: block;
		pointer-events: none;
		z-index: -1;

		top: calc(-1 * var(--spread));
		left: calc(-1 * var(--spread));
		width: calc(100% + var(--spread) * 2);
		height: calc(100% + var(--spread) * 2);
	}
</style>
