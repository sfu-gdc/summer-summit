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
		class="landing-main max-w-5xl [--landing-detail-gap:0.75rem] [--landing-slope-step:calc(1+var(--landing-detail-gap)/var(--landing-title-line-height))] [--landing-title-line-height:2.75rem] place-self-center relative lg:[--landing-title-line-height:4rem] md:[--landing-title-line-height:3.25rem] xl:[--landing-title-line-height:6.5rem]"
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
			class="landing-detail mx-auto mt-3 flex h-auto min-h-[var(--landing-detail-height)] w-full justify-center md:h-[var(--landing-detail-height)] lg:justify-end"
			data-landing-detail-grid
		>
			{#if cta}
				{@render cta()}
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
	[data-landing-content='base'] .landing-main {
		anchor-scope: --hero-text-base-first, --hero-text-base-second;
	}

	[data-landing-content='base'] .landing-title-first {
		anchor-name: --hero-text-base-first;
	}

	[data-landing-content='base'] .landing-title-second {
		anchor-name: --hero-text-base-second;
	}

	[data-landing-content='inverse'] .landing-main {
		anchor-scope: --hero-text-inverse-first, --hero-text-inverse-second;
	}

	[data-landing-content='inverse'] .landing-title-first {
		anchor-name: --hero-text-inverse-first;
	}

	[data-landing-content='inverse'] .landing-title-second {
		anchor-name: --hero-text-inverse-second;
	}

	@media (width >= 64rem) {
		@supports (left: anchor(--hero-text-base-first left)) and (width: calc(1px * (1px / 1px))) {
			.landing-detail {
				margin: 0;
				position: absolute;
				width: auto;
			}

			[data-landing-content='base'] .landing-detail {
				left: calc(
					anchor(--hero-text-base-second left) +
						(anchor(--hero-text-base-second left) - anchor(--hero-text-base-first left)) *
						var(--landing-slope-step)
				);
				position-anchor: --hero-text-base-second;
				right: calc(
					anchor(--hero-text-base-second right) +
						(anchor(--hero-text-base-second right) - anchor(--hero-text-base-first right)) *
						var(--landing-slope-step)
				);
				top: calc(anchor(--hero-text-base-second bottom) + var(--landing-detail-gap));
			}

			[data-landing-content='inverse'] .landing-detail {
				left: calc(
					anchor(--hero-text-inverse-second left) +
						(anchor(--hero-text-inverse-second left) - anchor(--hero-text-inverse-first left)) *
						var(--landing-slope-step)
				);
				position-anchor: --hero-text-inverse-second;
				right: calc(
					anchor(--hero-text-inverse-second right) +
						(anchor(--hero-text-inverse-second right) - anchor(--hero-text-inverse-first right)) *
						var(--landing-slope-step)
				);
				top: calc(anchor(--hero-text-inverse-second bottom) + var(--landing-detail-gap));
			}
		}
	}
</style>
