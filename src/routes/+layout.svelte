<script lang="ts">
	import { links } from 'unplugin-fonts/head';

	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import faviconIco from '$lib/assets/favicon.ico?no-inline';
	import favicon from '$lib/assets/favicon.svg';
	import favicon48 from '$lib/assets/favicon-48x48.png';
	import { providePageTransition } from '$lib/PageTransition/pageTransition.svelte';
	import PageTransitionOverlay from '$lib/PageTransition/PageTransitionOverlay.svelte';
	import SiteChrome from '$lib/SiteChrome/SiteChrome.svelte';
	import { heroColors, heroColorValues } from '$lib/tokens';

	import type { LayoutProps } from './$types';

	import 'unfonts.css';
	import 'virtual:uno.css';

	let { children }: LayoutProps = $props();
	const pageTransition = providePageTransition();

	onNavigate((navigation) => {
		const fromHome = navigation.from?.route.id === '/';
		const toHome = navigation.to?.route.id === '/';
		if (fromHome === toHome) return;

		if (fromHome) {
			return pageTransition.coverFromHome().then((transitionId) => () => {
				pageTransition.finishOnDarkPage(transitionId);
			});
		}

		const transitionId = pageTransition.prepareReveal();
		return () => {
			void pageTransition.revealHome(transitionId);
		};
	});
</script>

<svelte:head>
	{#each links as link (link.attrs?.['href'])}
		<link {...link.attrs ?? {}} />
	{/each}
	<meta name="theme-color" content={heroColorValues.background} />
	<link rel="icon" type="image/svg+xml" sizes="any" href={favicon} />
	<link rel="icon" type="image/png" sizes="48x48" href={favicon48} />
	<link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href={faviconIco} />
</svelte:head>

<div
	class="min-h-svh"
	data-page-transition-phase={pageTransition.phase}
	style:--page-transition-color={heroColors.outline}
	style:background={page.route.id === '/' ? heroColors.background : heroColors.outline}
>
	<div class="relative z-0" data-route-content>
		{@render children()}
	</div>
	<PageTransitionOverlay coordinator={pageTransition} />
	<SiteChrome coordinator={pageTransition} routeId={page.route.id} />
</div>
