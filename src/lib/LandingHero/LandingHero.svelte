<script module lang="ts">
	export type { LandingHeroProps } from './types';
</script>

<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	import { heroColors } from '$lib/tokens';

	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';
	import type { LandingHeroLayer } from './LandingHeroContent.svelte';
	import LandingHeroCtaGroup from './LandingHeroCtaGroup.svelte';
	import LandingHeroLayers from './LandingHeroLayers.svelte';
	import { LANDING_PUDDLE_PROFILES, type LandingPuddleProfileName } from './puddleProfiles';
	import type { LandingHeroProps } from './types';

	let {
		titleLines,
		dateLabel,
		actions,
		onPuddleTransitionTarget,
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

{#snippet heroActions(layer: LandingHeroLayer)}
	{#if actions}
		<LandingHeroCtaGroup actionSet={actions} {layer} />
	{/if}
{/snippet}

{#snippet inverseHero()}
	<LandingHeroLayers
		layer="inverse"
		{titleLines}
		{dateLabel}
		actions={actions ? heroActions : undefined}
	/>
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
			data-clip-aware-button={actions ? true : undefined}
			data-puddle-profile={puddleProfileName}
			snapshot={puddleProfileName}
			responsiveSnapshots
			onTransitionTarget={onPuddleTransitionTarget}
			clippedChildren={inverseHero}
		>
			<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
			<LandingHeroLayers
				layer="base"
				{titleLines}
				{dateLabel}
				actions={actions ? heroActions : undefined}
			/>
		</Puddle>
	</div>
</div>
