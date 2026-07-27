<script lang="ts">
	import type { Snippet } from 'svelte';

	import LandingHeroContent from './LandingHeroContent.svelte';
	import type { LandingHeroLayer } from './LandingHeroContent.svelte';
	import type { LandingHeroNavItem } from './types';

	interface Props {
		layer?: 'base' | 'inverse' | 'both';
		titleLines: readonly [string, string];
		dateLabel: string;
		organizerLabel: string;
		locationLabel: string;
		navItems?: readonly LandingHeroNavItem[];
		actions?: Snippet<[LandingHeroLayer]> | undefined;
	}

	let {
		layer = 'both',
		titleLines,
		dateLabel,
		organizerLabel,
		locationLabel,
		navItems = [],
		actions,
	}: Props = $props();
</script>

{#if layer === 'base' || layer === 'both'}
	<div class="content-layer inset-0 absolute" data-hero-content data-landing-layer="base">
		<LandingHeroContent
			layer="base"
			{titleLines}
			{dateLabel}
			{organizerLabel}
			{locationLabel}
			{navItems}
			{actions}
		/>
	</div>
{/if}
{#if layer === 'inverse' || layer === 'both'}
	<div
		aria-hidden="true"
		class="content-layer inverse-content-layer pointer-events-none inset-0 absolute"
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
			{actions}
		/>
	</div>
{/if}
