<script lang="ts">
	import type { Snippet } from 'svelte';

	import LandingHeroContent from './LandingHeroContent.svelte';
	import type { LandingHeroLayer } from './LandingHeroContent.svelte';

	interface Props {
		layer?: 'base' | 'inverse' | 'both';
		titleLines: readonly [string, string];
		dateLabel: string;
		actions?: Snippet<[LandingHeroLayer]> | undefined;
	}

	let { layer = 'both', titleLines, dateLabel, actions }: Props = $props();
</script>

{#if layer === 'base' || layer === 'both'}
	<div class="content-layer inset-0 absolute" data-hero-content data-landing-layer="base">
		<LandingHeroContent layer="base" {titleLines} {dateLabel} {actions} />
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
		<LandingHeroContent layer="inverse" {titleLines} {dateLabel} {actions} />
	</div>
{/if}
