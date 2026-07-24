<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { Component, ComponentProps } from 'svelte';

	import { Puddle } from '$lib';

	import { puddleStoryConfig } from '../Puddle/stories/storyConfig';
	import Hero from './Hero.svelte';

	type Args = ComponentProps<typeof Hero>;

	const { Story } = defineMeta<typeof template, Component>({
		title: 'Hero',
		component: Hero,
		subcomponents: { Puddle },
		args: {
			...puddleStoryConfig.args,
		},
		argTypes: {
			...puddleStoryConfig.argTypes,
		},
		parameters: {
			...puddleStoryConfig.parameters,
			layout: 'fullscreen',
		},
	});
</script>

{#snippet template(args: Args)}
	<Hero {...args} class="h-screen">
		<div class="flex flex-col h-full place-content-center place-items-center">
			<div class="text-8xl leading-[1.15] tracking-[0.04em] font-header text-center">
				SUMMER SUMMIT<br />GAME JAM 2026
			</div>
			<div class="px-10 flex max-w-[830px] w-full items-baseline justify-between">
				<span class="text-xl font-semibold">SEPT 4-6</span>
				<div></div>
			</div>
		</div></Hero
	>
{/snippet}

<Story name="Default" {template} />
