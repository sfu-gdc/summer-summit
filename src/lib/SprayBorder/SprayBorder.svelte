<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { type Color, formatCss, parse } from 'culori';
	import { ElementSize } from 'runed';

	import { browser } from '$app/environment';

	import { renderSpray } from './sprayRenderer';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Host element tag. `div` by default; use `button`/`a` to make the sprayed box itself interactive. */
		as?: 'div' | 'button' | 'a' | undefined;
		type?: HTMLButtonAttributes['type'] | undefined;
		disabled?: HTMLButtonAttributes['disabled'] | undefined;
		href?: HTMLAnchorAttributes['href'] | undefined;
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
		as = 'div',
		children,
		spread = 8,
		radius = 9,
		density = 1,
		seed = 7,
		color,
		class: className,
		...rest
	}: Props = $props();

	const colorObj = $derived(parse(color));
	// SSR'd onto the canvas so the no-JS fallback outline has the spray color.
	const cssColor = $derived(colorObj ? formatCss(colorObj) : undefined);

	let canvas = $state<HTMLCanvasElement | null>(null);
	let host = $state<HTMLElement | null>(null);
	// svelte:element only supports bind:this, so dimension bindings become a ResizeObserver.
	// ElementSize defaults to border-box, so the host's own padding counts toward the core.
	const hostSize = new ElementSize(() => host);

	// Stays false without JS or WebGL2, keeping the CSS fallback frame visible.
	let sprayed = $state(false);

	$effect(() => {
		if (!browser || !canvas || hostSize.width === 0 || hostSize.height === 0) return;
		if (!colorObj) {
			console.warn('<SprayBorder> invalid color', color);
			return;
		}
		sprayed = renderSpray(canvas, {
			cssW: hostSize.width,
			cssH: hostSize.height,
			dpr: devicePixelRatio.current ?? 1,
			spread,
			radius,
			density,
			seed,
			color: colorObj,
		});
	});
</script>

<svelte:element this={as} bind:this={host} class={['host', className]} {...rest}>
	<canvas
		bind:this={canvas}
		aria-hidden="true"
		style:--spread="{spread}px"
		style:--spray-color={cssColor}
		class="renderer"
		class:sprayed
	></canvas>
	{@render children?.()}
</svelte:element>

<style>
	/* The consumer styles this as the box to outline; the canvas overlays it and bleeds `spread` past. */
	.host {
		position: relative;
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

	/* No-JS / no-WebGL2 fallback: dashed frame at the box edge until the spray paints. */
	.renderer:not(.sprayed) {
		outline: 2px dashed var(--spray-color, currentColor);
		outline-offset: calc(-1 * var(--spread));
	}
</style>
