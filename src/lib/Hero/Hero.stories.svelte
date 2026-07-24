<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { brandColorValues } from '$lib/tokens';

	import { puddleStoryConfig } from '../Puddle/stories/storyConfig';
	import Hero from './Hero.svelte';

	type Args = ComponentProps<typeof Hero>;

	const { Story } = defineMeta<typeof template, typeof Hero>({
		title: 'Hero',
		component: Hero,
		args: {
			...puddleStoryConfig.args,
			backgroundColor: brandColorValues.primary['100'],
			puddleTextColor: brandColorValues.shade['50'],
			textColor: brandColorValues.secondary['500'],
		},
		argTypes: {
			...puddleStoryConfig.argTypes,
			backgroundColor: { control: 'color' },
			puddleTextColor: { control: 'color' },
			textColor: { control: 'color' },
		},
		parameters: {
			...puddleStoryConfig.parameters,
			layout: 'fullscreen',
			controls: {
				include: [
					...puddleStoryConfig.parameters.controls.include,
					'backgroundColor',
					'puddleTextColor',
					'textColor',
				],
			},
		},
	});
</script>

{#snippet template(args: Args)}
	<Hero {...args} />
{/snippet}

<Story name="Default" {template} />
