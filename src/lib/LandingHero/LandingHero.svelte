<script module lang="ts">
	export type { LandingHeroNavItem, LandingHeroProps } from './types';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	import { heroColors } from '$lib/tokens';

	import ClipAwareButton from '../Button/ClipAwareButton.svelte';
	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';
	import LandingHeroContent from './LandingHeroContent.svelte';
	import { LANDING_PUDDLE_PROFILES, type LandingPuddleProfileName } from './puddleProfiles';
	import type { LandingHeroProps } from './types';

	interface ButtonLayers {
		base: Snippet;
		inverse: Snippet;
	}

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

{#snippet composeContent(buttonLayers: ButtonLayers)}
	<div class="content-layer inset-0 absolute" data-hero-content data-landing-layer="base">
		<LandingHeroContent
			layer="base"
			{titleLines}
			{dateLabel}
			{organizerLabel}
			{locationLabel}
			{navItems}
			cta={cta ? buttonLayers.base : undefined}
		/>
	</div>
	<div
		aria-hidden="true"
		class="content-layer inverse-content-layer pointer-events-none [clip-path:var(--puddle-clip)] inset-0 absolute"
		data-hero-content-overlay
		data-landing-layer="inverse"
		inert
	>
		<LandingHeroContent
			layer="inverse"
			{titleLines}
			{dateLabel}
			{organizerLabel}
			{locationLabel}
			{navItems}
			cta={cta ? buttonLayers.inverse : undefined}
		/>
	</div>
{/snippet}

<div
	class={[
		'hero relative min-h-svh w-full overflow-hidden text-[var(--hero-text-color)] bg-[var(--hero-background-color)]',
		className,
	]}
	data-hero
	data-landing-hero
	style:--hero-background-color={heroColors.background}
	style:--hero-main-text-color={heroColors.mainContent}
	style:--hero-outline-color={heroColors.outline}
	style:--hero-puddle-text-color={heroColors.inverseContent}
	style:--hero-text-color={heroColors.content}
>
	<div class="hero-puddle-layer inset-0 absolute" data-hero-puddle-layer>
		<Puddle
			{...puddleProfile}
			color={heroColors.outline}
			class="size-full"
			data-clip-aware-button={cta ? true : undefined}
			data-puddle-profile={puddleProfileName}
		>
			<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
			<ClipAwareButton
				appearance="secondary"
				compose={composeContent}
				inverseAppearance="light"
				control={cta?.href !== undefined ? { href: cta.href } : undefined}
			>
				{#if cta}
					{cta.label}
				{/if}
			</ClipAwareButton>
		</Puddle>
	</div>
</div>
