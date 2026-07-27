<script lang="ts">
	import { links } from 'unplugin-fonts/head';

	import faviconIco from '$lib/assets/favicon.ico?no-inline';
	import favicon from '$lib/assets/favicon.svg';
	import favicon48 from '$lib/assets/favicon-48x48.png';
	import { heroColorValues } from '$lib/tokens';

	import type { LayoutProps } from './$types';

	import 'unfonts.css';
	import 'virtual:uno.css';

	let { children }: LayoutProps = $props();
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

{@render children()}
