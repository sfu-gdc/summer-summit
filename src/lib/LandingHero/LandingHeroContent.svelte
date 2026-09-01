<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type LandingHeroLayer = 'base' | 'inverse';

	export interface LandingHeroContentProps {
		layer: LandingHeroLayer;
		titleLines: readonly [string, string];
		dateLabel: string;
		actions?: Snippet<[LandingHeroLayer]> | undefined;
	}
</script>

<script lang="ts">
	import { buttonSizes } from '$lib/tokens';

	let { layer, titleLines, dateLabel, actions }: LandingHeroContentProps = $props();
</script>

<div
	class={[
		'flex h-full min-h-svh w-full p-4 items-center justify-center md:p-6 lg:p-8',
		{ 'text-[var(--hero-puddle-text-color)]': layer === 'inverse' },
	]}
	data-landing-content={layer}
	style:--landing-detail-height={buttonSizes.large.height}
>
	{#if layer === 'base'}
		<h1 class="select-none sr-only">{dateLabel} {titleLines[0]} {titleLines[1]}</h1>
	{/if}

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
			class="landing-detail mx-auto mt-1 flex h-auto min-h-[var(--landing-detail-height)] w-full justify-center lg:mt-0 md:h-[var(--landing-detail-height)] lg:justify-end"
			data-landing-detail-grid
		>
			{#if actions}
				{@render actions(layer)}
			{/if}
		</div>
	</main>
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
