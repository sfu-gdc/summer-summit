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
	<Hero {...args} />
{/snippet}

<Story name="Default" {template} />
