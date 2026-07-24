<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect, within } from 'storybook/test';

	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	import Button from './Button.svelte';

	type Args = ComponentProps<typeof Button>;

	const { Story } = defineMeta({
		title: 'Button',
		component: Button,
		decorators: [() => ({ Component: PaddingDecorator })],
		args: {
			appearance: 'dark',
			disabled: false,
		},
		argTypes: {
			appearance: { control: 'inline-radio', options: ['dark', 'light'] },
			disabled: { control: 'boolean' },
			spray: { control: 'boolean' },
		},
		parameters: {
			// bits-ui's ButtonRootProps leaks ~400 inherited HTML attributes into
			// autodocs (Storybook #32171). Whitelist the meaningful API instead.
			controls: {
				include: ['appearance', 'icon', 'disabled', 'href', 'type', 'children'],
			},
			docs: {
				argTypes: {
					include: ['appearance', 'icon', 'disabled', 'href', 'type', 'children'],
				},
			},
		},
	});
</script>

{#snippet bell()}
	<span class="i-mdi-bell text-base"></span>
{/snippet}

{#snippet template(args: Args)}
	<div class="flex flex-wrap gap-8 items-start">
		<div class="flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase">Default</span>
		</div>
		<div class="pseudo-hover-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase">Hover</span>
		</div>
		<div class="pseudo-active-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase">Active</span>
		</div>
		<div class="pseudo-focus-visible-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase"
				>Focus Visible</span
			>
		</div>
	</div>
{/snippet}

{#snippet figmaTreatments(args: Args)}
	<div class="p-10 bg-brand-primary-100 flex flex-col gap-10 items-start">
		<div class="flex gap-4 items-center">
			<Button {...args}>About</Button>
			<Button {...args}>Schedule</Button>
			<Button {...args}>FAQ</Button>
		</div>
		<div class="p-8 bg-brand-shade-900">
			<Button {...args} appearance="light">Join the jam</Button>
		</div>
	</div>
{/snippet}

{#snippet linkTemplate(args: Args)}
	<Button {...args}>About</Button>
{/snippet}

<Story
	name="Figma Treatments"
	template={figmaTreatments}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const about = canvas.getByRole('button', { name: 'About' });
		const schedule = canvas.getByRole('button', { name: 'Schedule' });
		const faq = canvas.getByRole('button', { name: 'FAQ' });
		const cta = canvas.getByRole('button', { name: 'Join the jam' });

		await expect(getComputedStyle(about).fontWeight).toBe('600');
		await expect(getComputedStyle(about).letterSpacing).toBe('normal');
		await expect(about.getBoundingClientRect().height).toBe(faq.getBoundingClientRect().height);
		await expect(schedule.getBoundingClientRect().width).toBeGreaterThan(
			faq.getBoundingClientRect().width,
		);
		await expect(getComputedStyle(about).color).not.toBe(getComputedStyle(cta).color);
	}}
/>

<Story name="States" {template} />

<Story name="With Icon" args={{ icon: bell }} {template} />

<Story name="Disabled" args={{ disabled: true }} {template} />

<Story
	name="Link"
	args={{ href: '#about' }}
	template={linkTemplate}
	play={async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole('link', { name: 'About' })).toHaveAttribute(
			'href',
			'#about',
		);
	}}
/>
