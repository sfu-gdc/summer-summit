<script lang="ts">
	import type { Snippet } from 'svelte';

	import LandingHeroContent from './LandingHeroContent.svelte';
	import type { LandingHeroNavItem } from './types';

	interface Props {
		titleLines: readonly [string, string];
		dateLabel: string;
		organizerLabel: string;
		locationLabel: string;
		navItems?: readonly LandingHeroNavItem[];
		baseActions?: Snippet | undefined;
		inverseActions?: Snippet | undefined;
	}

	let {
		titleLines,
		dateLabel,
		organizerLabel,
		locationLabel,
		navItems = [],
		baseActions,
		inverseActions,
	}: Props = $props();
</script>

<div class="content-layer inset-0 absolute" data-hero-content data-landing-layer="base">
	<LandingHeroContent
		layer="base"
		{titleLines}
		{dateLabel}
		{organizerLabel}
		{locationLabel}
		{navItems}
		cta={baseActions}
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
		cta={inverseActions}
	/>
</div>
