<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Hero from './Hero.svelte';
	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	const { Story } = defineMeta({
		title: 'Hero',
		component: Hero,
		decorators: [() => ({ Component: PaddingDecorator })],
	});
</script>

<Story name="Default" />
