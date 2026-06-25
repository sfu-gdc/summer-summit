<script lang="ts">
	import { links } from 'unplugin-fonts/head';
	import 'unfonts.css';
	import 'virtual:uno.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	{#each links as link (link.attrs?.['href'])}
		<link {...link.attrs ?? {}} />
	{/each}
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
