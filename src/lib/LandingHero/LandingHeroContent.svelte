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
		actions?: Snippet<[LandingHeroLayer]> | undefined;
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
		actions,
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
		<h1 class="select-none sr-only">{dateLabel} {titleLines[0]} {titleLines[1]}</h1>
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
		class="landing-main max-w-5xl place-self-center"
		style:color={layer === 'base' ? 'var(--hero-main-text-color)' : undefined}
	>
		<div
			aria-hidden="true"
			class={[
				'text-4xl leading-11 tracking-wide font-header text-center lg:text-7xl md:text-5xl xl:text-8xl lg:leading-16 md:leading-13 xl:leading-26',
				layer === 'inverse' && 'select-none',
			]}
			data-landing-title
		>
			<p
				class="text-sm font-body font-semibold text-start w-full uppercase lg:text-xl md:text-base"
				data-landing-date
			>
				{dateLabel}
			</p>
			<span class="landing-title-first inline-block">{titleLines[0]}</span><br />
			<span class="landing-title-second inline-block">{titleLines[1]}</span>
		</div>
		<div
			class="landing-detail mx-auto mt-2 flex h-auto min-h-[var(--landing-detail-height)] w-full justify-center lg:mt-0 md:h-[var(--landing-detail-height)] lg:justify-end"
			data-landing-detail-grid
		>
			{#if actions}
				{@render actions(layer)}
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

<style>
	@media (width < 48rem), (width >= 64rem) {
		.landing-main {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		}

		[data-landing-title] {
			display: contents;
		}

		[data-landing-date],
		.landing-title-first {
			grid-column: 1 / -1;
		}

		.landing-title-second,
		.landing-detail {
			grid-column: 2;
		}

		[data-landing-title] br {
			display: none;
		}
	}
</style>
