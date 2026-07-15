<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	import Hero from './Hero.svelte';

	const { Story } = defineMeta({
		title: 'Hero',
		component: Hero,
		decorators: [() => ({ Component: PaddingDecorator })],
	});
</script>

<Story name="Default" />
