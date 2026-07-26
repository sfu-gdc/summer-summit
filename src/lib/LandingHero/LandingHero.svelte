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
	import LandingHeroLayers from './LandingHeroLayers.svelte';
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
		actions,
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

{#snippet composeDiscord(discordLayers: ButtonLayers)}
	{#snippet composeTickets(ticketLayers: ButtonLayers)}
		{#snippet baseActions()}
			<div
				class="flex flex-col gap-2 w-full items-stretch justify-center md:flex-row md:gap-4 md:items-center lg:justify-end"
				data-landing-actions
			>
				{@render discordLayers.base()}
				{@render ticketLayers.base()}
			</div>
		{/snippet}

		{#snippet inverseActions()}
			<div
				class="flex flex-col gap-2 w-full items-stretch justify-center md:flex-row md:gap-4 md:items-center lg:justify-end"
				data-landing-actions
			>
				{@render discordLayers.inverse()}
				{@render ticketLayers.inverse()}
			</div>
		{/snippet}

		<LandingHeroLayers
			{titleLines}
			{dateLabel}
			{organizerLabel}
			{locationLabel}
			{navItems}
			{baseActions}
			{inverseActions}
		/>
	{/snippet}

	<ClipAwareButton
		appearance="secondary"
		compose={composeTickets}
		inverseAppearance="light"
		control={actions ? { href: actions.tickets.href } : undefined}
		size="large"
	>
		{actions?.tickets.label}
		<span aria-hidden="true" class="i-pixelarticons-arrow-right-box size-6"></span>
	</ClipAwareButton>
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
		>
			<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
			{#if actions}
				<ClipAwareButton
					appearance="light"
					compose={composeDiscord}
					inverseAppearance="primary"
					control={{ href: actions.discord.href }}
					variant="underline"
				>
					{actions.discord.label}
					<span aria-hidden="true" class="i-pixel-discord size-6"></span>
				</ClipAwareButton>
			{:else}
				<LandingHeroLayers {titleLines} {dateLabel} {organizerLabel} {locationLabel} {navItems} />
			{/if}
		</Puddle>
	</div>
</div>

<style>
	[data-landing-actions] :global([data-clip-aware-variant='spray']) {
		order: 1;
	}

	[data-landing-actions] :global([data-clip-aware-variant='underline']) {
		order: 2;
	}

	@media (width < 32rem) {
		[data-landing-actions] :global([data-clip-aware-visual]),
		[data-landing-actions] :global([data-button-surface]) {
			width: 100%;
		}
	}

	@media (width >= 64rem) {
		[data-landing-actions] :global([data-clip-aware-variant='underline']) {
			order: 1;
		}

		[data-landing-actions] :global([data-clip-aware-variant='spray']) {
			order: 2;
		}
	}
</style>
