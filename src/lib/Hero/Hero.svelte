<script module lang="ts">
	import type { Snippet } from 'svelte';

	import type { PuddleProps } from '../Puddle/config';

	export type HeroProps = Omit<PuddleProps, 'children'> & {
		/** Non-interactive content rendered in paired outside/inside-Puddle layers. */
		children?: Snippet;
		/** Optional inside-Puddle visuals rendered in the full-host clipped layer. */
		inverseChildren?: Snippet;
		/** Semantic controls rendered once; each control owns its clip-aware visual surfaces. */
		controls?: Snippet;
		/** Establishes a viewport-sized containing block for full-page heroes. */
		fullViewport?: boolean;
	};
</script>

<script lang="ts">
	import { heroColors } from '$lib/tokens';

	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';

	let {
		class: className,
		color = heroColors.outline,
		children,
		inverseChildren,
		controls,
		fullViewport = false,
		...puddleProps
	}: HeroProps = $props();
</script>

<div
	class={[
		'hero text-[var(--hero-text-color)] bg-[var(--hero-background-color)]',
		{ 'hero-full-viewport': fullViewport },
		className,
	]}
	data-hero
	style:--hero-background-color={heroColors.background}
	style:--hero-outline-color={heroColors.outline}
	style:--hero-puddle-text-color={heroColors.inverseContent}
	style:--hero-text-color={heroColors.content}
>
	<div class="hero-puddle-layer" data-hero-puddle-layer>
		<Puddle {...puddleProps} {color}>
			<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
			<div class="inset-0 absolute" data-hero-content>
				{@render children?.()}
			</div>
			<div
				aria-hidden="true"
				class="text-[var(--hero-puddle-text-color)] [clip-path:var(--puddle-clip)] inset-0 absolute"
				data-hero-content-overlay
				inert
				style:pointer-events="none"
			>
				{@render (inverseChildren ?? children)?.()}
			</div>
			<div class="inset-0 absolute" data-hero-controls style:pointer-events="none">
				{@render controls?.()}
			</div>
		</Puddle>
	</div>
</div>

<style>
	.hero {
		overflow: hidden;
		position: relative;
	}

	.hero-full-viewport {
		min-height: 100svh;
		width: 100%;
	}

	.hero-puddle-layer {
		inset: 0;
		position: absolute;
	}

	.hero-puddle-layer > :global([data-puddle-host]) {
		height: 100%;
		width: 100%;
	}
</style>
