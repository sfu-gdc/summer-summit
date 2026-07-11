<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	import Button from './Button.svelte';

	type Args = ComponentProps<typeof Button>;

	const { Story } = defineMeta({
		title: 'Button',
		component: Button,
		decorators: [() => ({ Component: PaddingDecorator })],
		args: {
			disabled: false,
		},
		argTypes: {
			disabled: { control: 'boolean' },
		},
		parameters: {
			// bits-ui's ButtonRootProps leaks ~400 inherited HTML attributes into
			// autodocs (Storybook #32171). Whitelist the meaningful API instead.
			controls: { include: ['icon', 'disabled', 'href', 'type', 'children'] },
			docs: { argTypes: { include: ['icon', 'disabled', 'href', 'type', 'children'] } },
		},
	});
</script>

{#snippet bell()}
	<span class="i-mdi-bell text-base"></span>
{/snippet}

{#snippet template(args: Args)}
	<div class="flex flex-wrap gap-8 items-start">
		<div class="flex flex-col gap-3 items-center">
			<Button {...args}>Notify me</Button>
			<span class="text-xs text-brand-shade-500 tracking-wide font-sans uppercase">Default</span>
		</div>
		<div class="pseudo-hover-all flex flex-col gap-3 items-center">
			<Button {...args}>Notify me</Button>
			<span class="text-xs text-brand-shade-500 tracking-wide font-sans uppercase">Hover</span>
		</div>
		<div class="pseudo-active-all flex flex-col gap-3 items-center">
			<Button {...args}>Notify me</Button>
			<span class="text-xs text-brand-shade-500 tracking-wide font-sans uppercase">Active</span>
		</div>
		<div class="pseudo-focus-visible-all flex flex-col gap-3 items-center">
			<Button {...args}>Notify me</Button>
			<span class="text-xs text-brand-shade-500 tracking-wide font-sans uppercase"
				>Focus Visible</span
			>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="With Icon" args={{ icon: bell }} {template} />

<Story name="Disabled" args={{ disabled: true }} {template} />
