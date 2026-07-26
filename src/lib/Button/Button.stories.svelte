<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect, userEvent, within } from 'storybook/test';

	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	import Button from './Button.svelte';
	import ButtonSurface from './ButtonSurface.svelte';

	type Args = ComponentProps<typeof Button>;
	const layeredClipPath = 'inset(0 0 0 50%)';

	function requiredElement(parent: ParentNode, selector: string): HTMLElement {
		const element = parent.querySelector<HTMLElement>(selector);
		if (!element) throw new Error(`Expected ${selector}`);
		return element;
	}

	const { Story } = defineMeta({
		title: 'Button',
		component: Button,
		decorators: [() => ({ Component: PaddingDecorator })],
		args: {
			appearance: 'dark',
			disabled: false,
			size: 'default',
			variant: 'spray',
		},
		argTypes: {
			appearance: {
				control: 'inline-radio',
				options: ['primary', 'secondary', 'dark', 'light'],
			},
			disabled: { control: 'boolean' },
			size: { control: 'inline-radio', options: ['default', 'large'] },
			spray: { control: 'boolean' },
			variant: { control: 'inline-radio', options: ['spray', 'underline'] },
		},
		parameters: {
			// bits-ui's ButtonRootProps leaks ~400 inherited HTML attributes into
			// autodocs (Storybook #32171). Whitelist the meaningful API instead.
			controls: {
				include: [
					'appearance',
					'size',
					'variant',
					'icon',
					'disabled',
					'href',
					'type',
					'children',
					'overlay',
					'visuals',
				],
			},
			docs: {
				argTypes: {
					include: [
						'appearance',
						'size',
						'variant',
						'icon',
						'disabled',
						'href',
						'type',
						'children',
						'overlay',
						'visuals',
					],
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
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase">Default</span>
		</div>
		<div class="pseudo-hover-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase">Hover</span>
		</div>
		<div class="pseudo-active-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase">Active</span>
		</div>
		<div class="pseudo-focus-visible-all flex flex-col gap-3 items-center">
			<Button {...args}>About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase"
				>Focus Visible</span
			>
		</div>
	</div>
{/snippet}

{#snippet figmaReferenceVariants(args: Args)}
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

{#snippet largeCta(args: Args)}
	<div class="p-8 bg-brand-shade-900">
		<Button {...args} appearance="light" size="large">Join the jam</Button>
	</div>
{/snippet}

{#snippet primary(args: Args)}
	<div class="p-8 bg-brand-shade-50">
		<Button {...args} appearance="primary" size="large">Join the jam</Button>
	</div>
{/snippet}

{#snippet secondary(args: Args)}
	<div class="p-8 bg-brand-primary-100">
		<Button {...args} appearance="secondary" size="large">Join the jam</Button>
	</div>
{/snippet}

{#snippet underline(args: Args)}
	<div class="p-8 bg-brand-shade-900 flex flex-wrap gap-8 items-start">
		<div class="flex flex-col gap-3 items-center">
			<Button {...args} variant="underline">About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase">Default</span>
		</div>
		<div class="pseudo-hover-all flex flex-col gap-3 items-center">
			<Button {...args} variant="underline">About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-body uppercase">Hover</span>
		</div>
	</div>
{/snippet}

{#snippet layered(args: Args)}
	<Button {...args} overlay={{ appearance: 'light', clipPath: layeredClipPath }}
		>Layered control</Button
	>
{/snippet}

{#snippet semanticOnly(args: Args)}
	<Button {...args} visuals={false}>Semantic only</Button>
{/snippet}

{#snippet presentationSurface()}
	<span class="inline-flex relative">
		<ButtonSurface appearance="light" presentation size="large">Join the jam</ButtonSurface>
	</span>
{/snippet}

<Story name="Figma Reference Variants" template={figmaReferenceVariants} />

<Story name="States" {template} />

<Story name="With Icon" args={{ icon: bell }} {template} />

<Story name="Disabled" args={{ disabled: true }} {template} />

<Story name="Large CTA" template={largeCta} />

<Story name="Secondary" template={secondary} />

<Story name="Primary" template={primary} />

<Story name="Underline" template={underline} />

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

<Story
	name="Layered Control"
	template={layered}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const controls = canvas.getAllByRole('button', { name: 'Layered control' });
		const button = canvas.getByRole('button', { name: 'Layered control' });
		const surfaces = button.querySelectorAll<HTMLElement>('[data-button-surface]');
		const base = requiredElement(button, '[data-button-surface="base"]');
		const overlay = requiredElement(button, '[data-button-surface="overlay"]');

		await expect(controls).toHaveLength(1);
		await expect(surfaces).toHaveLength(2);
		await expect(base).not.toBeNull();
		await expect(overlay).toHaveAttribute('aria-hidden', 'true');
		await expect(overlay).toHaveAttribute('inert');
		await expect(getComputedStyle(overlay).pointerEvents).toBe('none');
		await expect(overlay.style.clipPath).not.toBe('');
		await expect(overlay.style.clipPath).not.toBe('none');
		await expect(overlay.style.clipPath).toContain('50%');

		const baseRect = base.getBoundingClientRect();
		const overlayRect = overlay.getBoundingClientRect();
		await expect(overlayRect.left).toBeCloseTo(baseRect.left);
		await expect(overlayRect.top).toBeCloseTo(baseRect.top);
		await expect(overlayRect.width).toBeCloseTo(baseRect.width);
		await expect(overlayRect.height).toBeCloseTo(baseRect.height);

		let activations = 0;
		button.addEventListener('click', () => {
			activations += 1;
		});

		await userEvent.click(button);
		await expect(activations).toBe(1);

		button.focus();
		await userEvent.keyboard('{Enter}');
		await expect(activations).toBe(2);
		await expect(overlay.matches(':focus')).toBe(false);

		button.blur();
		canvasElement.ownerDocument.body.focus();
		await userEvent.tab();
		await expect(button).toHaveFocus();
	}}
/>

<Story
	name="Presentation Surface"
	template={presentationSurface}
	play={async ({ canvasElement }) => {
		const surface = requiredElement(canvasElement, '[data-button-surface="base"]');
		const content = requiredElement(surface, '.button-surface-content');

		await expect(content.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
	}}
/>

<Story
	name="Semantic Only"
	template={semanticOnly}
	play={async ({ canvasElement }) => {
		const button = within(canvasElement).getByRole('button', { name: 'Semantic only' });
		const label = requiredElement(button, '.button-layout');
		let activations = 0;
		button.addEventListener('click', () => {
			activations += 1;
		});

		await expect(button.querySelectorAll('[data-button-surface]')).toHaveLength(0);
		await expect(label).not.toHaveAttribute('aria-hidden');

		await userEvent.click(button);
		await expect(activations).toBe(1);
	}}
/>

<Story
	name="Semantic Only Disabled"
	args={{ disabled: true }}
	template={semanticOnly}
	play={async ({ canvasElement }) => {
		const button = within(canvasElement).getByRole('button', { name: 'Semantic only' });

		await expect(button).toBeDisabled();
		await expect(button.querySelectorAll('[data-button-surface]')).toHaveLength(0);
	}}
/>
