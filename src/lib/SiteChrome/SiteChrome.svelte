<script lang="ts">
	import { resolve } from '$app/paths';
	import eventMark from '$lib/assets/event-mark.png';
	import type { PageTransitionCoordinator } from '$lib/PageTransition/pageTransition.svelte';
	import { PUDDLE_SNAPSHOTS } from '$lib/Puddle/generated/puddleSnapshots';
	import { heroColors } from '$lib/tokens';

	interface Props {
		coordinator: PageTransitionCoordinator;
		routeId: string | null;
	}

	let { coordinator, routeId }: Props = $props();

	const instanceId = $props.id();
	const clipId = `${instanceId}-site-chrome-clip`;
	const clipUrl = `url("#${clipId}")`;
	const navItems = [
		{ label: 'HOME', path: '/' },
		{ label: 'ABOUT', path: '/about' },
	] as const;
	const inverseFull = $derived(routeId !== '/' && coordinator.phase === 'idle');
	const initialHomeMask = $derived(routeId === '/' && coordinator.overlayPath.length === 0);
	const navigationEnabled = $derived(coordinator.phase === 'idle');
</script>

{#snippet chromeSurface(layer: 'semantic' | 'inverse')}
	<div
		class="p-4 grid grid-rows-[auto_minmax(0,1fr)_auto] pointer-events-none inset-0 fixed lg:p-8 md:p-6"
		data-site-chrome-layer={layer}
		style:--site-chrome-content={layer === 'inverse'
			? heroColors.inverseContent
			: heroColors.content}
		style:--site-chrome-footer={layer === 'inverse' ? heroColors.background : heroColors.content}
		style:--site-chrome-nav-background={layer === 'inverse'
			? heroColors.background
			: heroColors.outline}
		style:--site-chrome-nav-content={layer === 'inverse'
			? heroColors.outline
			: heroColors.inverseContent}
	>
		<header class="flex gap-3 items-start justify-between">
			<a
				href={resolve('/')}
				aria-label="Home"
				aria-disabled={layer === 'semantic' && !navigationEnabled ? 'true' : undefined}
				tabindex={layer === 'semantic' && !navigationEnabled ? -1 : undefined}
				class={[
					'text-[var(--site-chrome-content)] no-underline flex shrink-0 gap-2.5 items-center',
					layer === 'semantic' && navigationEnabled && 'pointer-events-auto',
				]}
			>
				<span
					aria-hidden="true"
					class="site-event-mark size-6 md:size-8"
					style:--site-chrome-mark={`url("${eventMark}")`}
				></span>
				<span class="text-xl leading-none font-header translate-y-0.5 md:text-2xl">
					SUMMER GAME JAM 2026
				</span>
			</a>
			<nav aria-label="Primary" class="flex flex-wrap gap-2 justify-end">
				{#each navItems as item (item.path)}
					<a
						href={resolve(item.path)}
						aria-current={routeId === item.path ? 'page' : undefined}
						aria-disabled={layer === 'semantic' && !navigationEnabled ? 'true' : undefined}
						tabindex={layer === 'semantic' && !navigationEnabled ? -1 : undefined}
						class={[
							'text-sm leading-none font-body font-semibold h-10 px-4 rounded-md uppercase transition-opacity inline-flex items-center justify-center md:text-base hover:opacity-75',
							layer === 'semantic' && navigationEnabled && 'pointer-events-auto',
						]}
						style:background="var(--site-chrome-nav-background)"
						style:color="var(--site-chrome-nav-content)"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</header>

		<div></div>

		<footer
			class="text-base leading-none font-body font-semibold flex gap-4 uppercase items-end justify-between md:text-xl"
			style:color="var(--site-chrome-footer)"
		>
			<p>GAME DEV CLUB X IATSU 2026</p>
			<p class="text-right">SFU BURNABY CAMPUS</p>
		</footer>
	</div>
{/snippet}

<div class="pointer-events-none inset-0 fixed z-30" data-site-chrome>
	<!-- eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- Svelte parameterized snippets are typed as void. -->
	{@render chromeSurface('semantic')}

	<svg aria-hidden="true" class="size-0 absolute" data-site-chrome-mask>
		<defs>
			<clipPath id={clipId} clipPathUnits="userSpaceOnUse">
				<path d={coordinator.overlayPath} transform={coordinator.overlayClipTransform}></path>
			</clipPath>
		</defs>
	</svg>

	<div
		aria-hidden="true"
		class="pointer-events-none inset-0 fixed"
		data-site-chrome-inverse
		data-site-chrome-inverse-full={inverseFull ? true : undefined}
		inert
		style:--site-chrome-clip-compact={PUDDLE_SNAPSHOTS.compact.clip}
		style:--site-chrome-clip-medium={PUDDLE_SNAPSHOTS.medium.clip}
		style:--site-chrome-clip-expanded={PUDDLE_SNAPSHOTS.expanded.clip}
		style:--site-chrome-clip-large={PUDDLE_SNAPSHOTS.large.clip}
		style:clip-path={inverseFull
			? 'none'
			: initialHomeMask
				? 'var(--site-chrome-initial-clip)'
				: clipUrl}
	>
		<!-- eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- Svelte parameterized snippets are typed as void. -->
		{@render chromeSurface('inverse')}
	</div>
</div>

<style>
	.site-event-mark {
		background: var(--site-chrome-content);
		mask: var(--site-chrome-mark) center / contain no-repeat;
		-webkit-mask: var(--site-chrome-mark) center / contain no-repeat;
	}

	[data-site-chrome-inverse] {
		--site-chrome-initial-clip: var(--site-chrome-clip-compact);
	}

	@media (min-width: 48rem) {
		[data-site-chrome-inverse] {
			--site-chrome-initial-clip: var(--site-chrome-clip-medium);
		}
	}

	@media (min-width: 64rem) {
		[data-site-chrome-inverse] {
			--site-chrome-initial-clip: var(--site-chrome-clip-expanded);
		}
	}

	@media (min-width: 96rem) {
		[data-site-chrome-inverse] {
			--site-chrome-initial-clip: var(--site-chrome-clip-large);
		}
	}
</style>
