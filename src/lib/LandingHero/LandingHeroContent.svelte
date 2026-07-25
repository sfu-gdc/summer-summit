<script module lang="ts">
	import type { Snippet } from 'svelte';

	import type { LandingHeroNavItem } from './types';

	export type LandingHeroLayer = 'base' | 'inverse';

	export interface LandingHeroContentProps {
		layer: LandingHeroLayer;
		titleLines: readonly [string, string];
		dateLabel: string;
		organizerLabel: string;
		locationLabel: string;
		navItems?: readonly LandingHeroNavItem[];
		cta?: Snippet | undefined;
	}
</script>

<script lang="ts">
	import eventMark from '$lib/assets/event-mark.png';
	import { buttonSizes } from '$lib/tokens';

	let {
		layer,
		titleLines,
		dateLabel,
		organizerLabel,
		locationLabel,
		navItems = [],
		cta,
	}: LandingHeroContentProps = $props();
</script>

<div
	class={[
		'grid h-full min-h-svh w-full grid-rows-[auto_minmax(0,1fr)_auto] p-4 md:p-6 lg:p-8',
		{ 'text-[var(--hero-puddle-text-color)]': layer === 'inverse' },
	]}
	data-landing-content={layer}
	style:--landing-detail-height={buttonSizes.large.height}
>
	{#if layer === 'base'}
		<h1 class="select-none sr-only">{titleLines[0]} {titleLines[1]}</h1>
	{/if}

	<header class="flex items-start justify-between">
		<div class="flex gap-2.5 items-center">
			<img src={eventMark} alt="" width="745" height="745" class="size-6 md:size-8" />
			<p class="text-xl leading-none font-header translate-y-0.5 md:text-2xl">
				SUMMER GAME JAM 2026
			</p>
		</div>
		<!-- TODO(next milestone): add navigation after mobile behavior and destinations are designed. -->
		{#if navItems.length > 0}
			<!-- Destinations are intentionally not rendered in this milestone. -->
		{/if}
	</header>

	<main
		class="max-w-5xl w-full place-self-center"
		style:color={layer === 'base' ? 'var(--hero-main-text-color)' : undefined}
	>
		<div
			aria-hidden="true"
			class="text-4xl leading-11 tracking-wide font-header text-center select-none lg:text-7xl md:text-5xl xl:text-8xl lg:leading-16 md:leading-13 xl:leading-26"
			data-landing-title
		>
			<span class="block">{titleLines[0]}</span>
			<span class="block">{titleLines[1]}</span>
		</div>

		<div
			class="mx-auto mt-3 grid grid-cols-2 h-[var(--landing-detail-height)] w-full items-center lg:w-4/6 md:w-4/8"
			data-landing-detail-grid
		>
			<p
				class="text-base leading-none font-body font-semibold uppercase md:text-xl"
				data-landing-date
			>
				{dateLabel}
			</p>
			{#if cta}
				<div class="col-start-2 justify-self-end">
					{@render cta()}
				</div>
			{/if}
		</div>
	</main>

	<footer
		class="text-base leading-none font-body font-semibold flex gap-4 uppercase items-end justify-between md:text-xl"
	>
		<p>{organizerLabel}</p>
		<p class="text-right">{locationLabel}</p>
	</footer>
</div>
