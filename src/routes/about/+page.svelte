<script lang="ts">
	import Head from '$lib/Head.svelte';
	import { heroColors } from '$lib/tokens';
</script>

<Head />

<main
	class="text-[var(--about-content)] p-4 py-28 flex w-full items-center justify-center min-h-svh lg:p-8 md:p-6 lg:py-32 md:py-32"
	style:--about-accent={heroColors.background}
	style:--about-background={heroColors.outline}
	style:--about-content={heroColors.inverseContent}
	style:background="var(--about-background)"
	data-about-page
>
	<div class="mx-auto text-center flex flex-col gap-6 max-w-5xl w-full items-center">
		<h1
			class="text-3xl leading-tight font-header lg:text-5xl md:text-4xl"
			style:color="var(--about-accent)"
		>
			A GAME JAM FOR EVERY CREATOR
		</h1>
		<p class="text-lg leading-relaxed font-body max-w-3xl lg:text-2xl md:text-xl">
			Taking place in person on September 6, Summer Summit is a beginner-friendly game jam where
			students from art, coding, design, music, writing, and interactive media come together to
			build playable games. This year marks the third annual SFU Summer Summit. The goal is to
			create a fun, collaborative environment that makes game development more accessible to
			everyone.
		</p>
	</div>
</main>
