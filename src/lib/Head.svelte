<script lang="ts">
	import ogImage from '$lib/assets/og-image.png';

	const title = 'Summer Summit 2026';
	const description =
		'Make games fast and meet new people at the 2026 Summer Summit Game Jam, presented by the SFU Game Dev Club and the Interactive Arts and Technology Student Union.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:type" content="website" />
	<meta name="color-scheme" content="dark" />
</svelte:head>
