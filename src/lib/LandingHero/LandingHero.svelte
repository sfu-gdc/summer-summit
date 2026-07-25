<script module lang="ts">
	export interface LandingHeroNavItem {
		label: string;
		href: string;
	}

	export interface LandingHeroProps {
		titleLines: readonly [string, string];
		dateLabel: string;
		organizerLabel: string;
		locationLabel: string;
		navItems?: readonly LandingHeroNavItem[];
		cta?:
			| {
					label: string;
					href?: string;
			  }
			| undefined;
		class?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	import eventMark from '$lib/assets/event-mark.png';

	import ClipAwareButton from '../Button/ClipAwareButton.svelte';
	import Hero from '../Hero/Hero.svelte';
	import { LANDING_PUDDLE_PROFILES, type LandingPuddleProfileName } from './puddleProfiles';

	let {
		titleLines,
		dateLabel,
		organizerLabel,
		locationLabel,
		navItems = [],
		cta,
		class: className,
	}: LandingHeroProps = $props();

	const mediumPuddle = new MediaQuery('(min-width: 48rem)');
	const expandedPuddle = new MediaQuery('(min-width: 64rem)');
	const largePuddle = new MediaQuery('(min-width: 96rem)');
	const puddleProfileName = $derived<LandingPuddleProfileName>(
		largePuddle.current
			? 'large'
			: expandedPuddle.current
				? 'expanded'
				: mediumPuddle.current
					? 'medium'
					: 'compact',
	);
	const puddleProfile = $derived(LANDING_PUDDLE_PROFILES[puddleProfileName]);
</script>

{#snippet ctaPlacement(content: Snippet)}
	<div class="landing-layout h-full pointer-events-none inset-0 absolute">
		<div aria-hidden="true"></div>

		<div class="central-content max-w-5xl w-full place-self-center">
			<div
				aria-hidden="true"
				class="text-4xl leading-11 tracking-wide font-header text-center invisible lg:text-7xl md:text-5xl xl:text-8xl lg:leading-16 md:leading-13 xl:leading-26"
			>
				<span class="block">{titleLines[0]}</span>
				<span class="block">{titleLines[1]}</span>
			</div>

			<div class="detail-grid mx-auto mt-6 w-full items-center md:mt-8 lg:w-4/6 md:w-2/3">
				<div class="detail-cta">
					{@render content()}
				</div>
			</div>
		</div>
	</div>
{/snippet}

<Hero fullViewport class={className} {...puddleProfile} data-puddle-profile={puddleProfileName}>
	<div class="landing-layout h-full">
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

		<main class="central-content max-w-5xl w-full place-self-center">
			<div
				aria-hidden="true"
				class="text-4xl leading-11 tracking-wide font-header text-center lg:text-7xl md:text-5xl xl:text-8xl lg:leading-16 md:leading-13 xl:leading-26"
				data-landing-title
			>
				<span class="block">{titleLines[0]}</span>
				<span class="block">{titleLines[1]}</span>
			</div>

			<div class="detail-grid mx-auto mt-6 w-full items-center md:mt-8 lg:w-4/6 md:w-2/3">
				<p class="text-base leading-none font-body font-semibold uppercase md:text-xl">
					{dateLabel}
				</p>
			</div>
		</main>

		<footer
			class="text-base leading-none font-body font-semibold flex gap-4 uppercase items-end justify-between md:text-xl"
		>
			<p>{organizerLabel}</p>
			<p class="text-right">{locationLabel}</p>
		</footer>
	</div>

	{#snippet controls()}
		<h1 class="sr-only">{titleLines[0]} {titleLines[1]}</h1>
		{#if cta}
			<ClipAwareButton
				appearance="dark"
				inverseAppearance="light"
				clipPath="var(--puddle-clip)"
				placement={ctaPlacement}
				control={cta.href !== undefined ? { href: cta.href } : undefined}
				size="large"
			>
				{cta.label}
			</ClipAwareButton>
		{/if}
	{/snippet}
</Hero>

<style>
	.landing-layout {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		min-height: 100svh;
		padding: 1rem;
		width: 100%;
	}

	.central-content {
		align-self: center;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.detail-cta {
		grid-column: 2;
		justify-self: end;
	}

	@media (min-width: 48rem) {
		.landing-layout {
			padding: 1.5rem;
		}
	}

	@media (min-width: 64rem) {
		.landing-layout {
			padding: 2rem;
		}
	}
</style>
