<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect, userEvent, within } from 'storybook/test';

	import PaddingDecorator from '$storybook/PaddingDecorator.svelte';

	import Button from './Button.svelte';
	import ButtonSurface from './ButtonSurface.svelte';

	type Args = ComponentProps<typeof Button>;

	function ruleTexts(rules: CSSRuleList): string[] {
		return Array.from(rules).flatMap((rule) => {
			const nested = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules;
			return nested ? [rule.cssText, ...ruleTexts(nested)] : [rule.cssText];
		});
	}

	function documentRules(element: HTMLElement, selector: string): string {
		return Array.from(element.ownerDocument.styleSheets)
			.flatMap((sheet) => ruleTexts(sheet.cssRules))
			.filter((rule) => rule.includes(selector))
			.join('\n');
	}

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
			appearance: { control: 'inline-radio', options: ['accent', 'dark', 'light'] },
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

{#snippet secondaryAccent(args: Args)}
	<div class="p-8 bg-brand-primary-100">
		<Button {...args} appearance="accent" size="large">Join the jam</Button>
	</div>
{/snippet}

{#snippet underline(args: Args)}
	<div class="flex flex-wrap gap-8 items-start">
		<div class="flex flex-col gap-3 items-center">
			<Button {...args} variant="underline">About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase">Default</span>
		</div>
		<div class="pseudo-hover-all flex flex-col gap-3 items-center">
			<Button {...args} variant="underline">About</Button>
			<span class="text-xs text-brand-primary-500 tracking-wide font-sans uppercase">Hover</span>
		</div>
	</div>
{/snippet}

{#snippet layered(args: Args)}
	<Button {...args} overlay={{ appearance: 'light', clipPath: 'inset(0 0 0 50%)' }}
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

<Story
	name="Figma Reference Variants"
	template={figmaReferenceVariants}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const about = canvas.getByRole('button', { name: 'About' });
		const schedule = canvas.getByRole('button', { name: 'Schedule' });
		const faq = canvas.getByRole('button', { name: 'FAQ' });
		const cta = canvas.getByRole('button', { name: 'Join the jam' });
		const aboutSurface = requiredElement(about, '[data-button-surface="base"]');
		const ctaSurface = requiredElement(cta, '[data-button-surface="base"]');
		const aboutSpray = aboutSurface.querySelector<HTMLElement>('[data-spray-radius]');
		const aboutCanvas = requiredElement(aboutSurface, 'canvas');

		await expect(getComputedStyle(about).fontWeight).toBe('600');
		await expect(getComputedStyle(about).fontSize).toBe('16px');
		await expect(getComputedStyle(about).lineHeight).toBe('24px');
		await expect(getComputedStyle(about).letterSpacing).toBe('normal');
		await expect(about.getBoundingClientRect().height).toBeCloseTo(40);
		await expect(getComputedStyle(about).paddingInline).toBe('8px');
		await expect(about.getBoundingClientRect().height).toBe(faq.getBoundingClientRect().height);
		await expect(schedule.getBoundingClientRect().width).toBeGreaterThan(
			faq.getBoundingClientRect().width,
		);
		await expect(getComputedStyle(aboutSurface).color).not.toBe(getComputedStyle(ctaSurface).color);
		await expect(aboutSpray).toHaveAttribute('data-spray-radius', '6');
		await expect(aboutSpray).toHaveAttribute('data-spray-spread', '6');

		const buttonRect = about.getBoundingClientRect();
		const canvasRect = aboutCanvas.getBoundingClientRect();
		await expect(canvasRect.left).toBeCloseTo(buttonRect.left - 6);
		await expect(canvasRect.top).toBeCloseTo(buttonRect.top - 6);
		await expect(canvasRect.width).toBeCloseTo(buttonRect.width + 12);
		await expect(canvasRect.height).toBeCloseTo(buttonRect.height + 12);
	}}
/>

<Story
	name="States"
	{template}
	play={async ({ canvasElement }) => {
		const [defaultButton, hoverButton, activeButton, focusButton] = within(
			canvasElement,
		).getAllByRole('button', { name: 'About' }) as [
			HTMLElement,
			HTMLElement,
			HTMLElement,
			HTMLElement,
		];

		await expect(getComputedStyle(defaultButton).transform).toBe('none');
		await expect(getComputedStyle(hoverButton).transform).toBe('none');
		await expect(documentRules(activeButton, '.summer-summit-button:active')).toMatch(
			/(?:scale|transform)[^;}]*0?\.98/,
		);
		await expect(
			documentRules(focusButton, '.summer-summit-button:focus-visible:not(:disabled)'),
		).toMatch(/border-radius[^;}]*(?:4px|0\.25rem)/);
	}}
/>

<Story name="With Icon" args={{ icon: bell }} {template} />

<Story name="Disabled" args={{ disabled: true }} {template} />

<Story
	name="Large CTA"
	template={largeCta}
	play={async ({ canvasElement }) => {
		const cta = within(canvasElement).getByRole('button', { name: 'Join the jam' });
		const surface = cta.querySelector<HTMLElement>('[data-button-surface="base"]');
		const spray = surface?.querySelector<HTMLElement>('[data-spray-radius]');
		const canvas = surface?.querySelector('canvas');

		await expect(cta.getBoundingClientRect().height).toBeCloseTo(48);
		await expect(getComputedStyle(cta).paddingInline).toBe('16px');
		await expect(spray).toHaveAttribute('data-spray-radius', '8');
		await expect(spray).toHaveAttribute('data-spray-spread', '8');
		await expect(canvas).not.toBeNull();
		if (!canvas) return;

		const buttonRect = cta.getBoundingClientRect();
		const canvasRect = canvas.getBoundingClientRect();
		await expect(canvasRect.left).toBeCloseTo(buttonRect.left - 8);
		await expect(canvasRect.top).toBeCloseTo(buttonRect.top - 8);
		await expect(canvasRect.width).toBeCloseTo(buttonRect.width + 16);
		await expect(canvasRect.height).toBeCloseTo(buttonRect.height + 16);
	}}
/>

<Story name="Secondary Accent" template={secondaryAccent} />

<Story
	name="Underline"
	template={underline}
	play={async ({ canvasElement }) => {
		const [defaultButton, hoverButton] = within(canvasElement).getAllByRole('button', {
			name: 'About',
		}) as [HTMLElement, HTMLElement];
		const defaultSurface = requiredElement(defaultButton, '[data-button-underline]');
		const defaultDots = requiredElement(defaultSurface, '.underline-button-dots');
		const defaultLine = requiredElement(defaultSurface, '.underline-button-line');
		const hoverDots = requiredElement(hoverButton, '.underline-button-dots');
		const hoverLine = requiredElement(hoverButton, '.underline-button-line');

		await expect(defaultButton).toHaveAttribute('data-button-variant', 'underline');
		await expect(getComputedStyle(defaultButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
		await expect(getComputedStyle(defaultButton).borderTopWidth).toBe('0px');
		await expect(getComputedStyle(defaultDots).backgroundImage).toContain(
			'repeating-linear-gradient',
		);
		await expect(getComputedStyle(defaultDots).opacity).toBe('1');
		await expect(getComputedStyle(defaultLine).transform).not.toBe('none');
		await expect(getComputedStyle(hoverDots).opacity).toBe('0');
		await expect(getComputedStyle(hoverLine).transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
	}}
/>

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
		await expect(getComputedStyle(overlay).clipPath).toBe('inset(0px 0px 0px 50%)');
		await expect(getComputedStyle(base).fontFamily).toBe(getComputedStyle(overlay).fontFamily);
		await expect(getComputedStyle(base).fontSize).toBe(getComputedStyle(overlay).fontSize);
		await expect(getComputedStyle(base).fontWeight).toBe(getComputedStyle(overlay).fontWeight);
		await expect(getComputedStyle(base).lineHeight).toBe(getComputedStyle(overlay).lineHeight);

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

		await expect(getComputedStyle(base).getPropertyValue('--button-surface-content')).not.toBe(
			getComputedStyle(base).getPropertyValue('--button-surface-hover-content'),
		);
		await expect(getComputedStyle(overlay).getPropertyValue('--button-surface-content')).not.toBe(
			getComputedStyle(overlay).getPropertyValue('--button-surface-hover-content'),
		);
	}}
/>

<Story
	name="Presentation Surface"
	template={presentationSurface}
	play={async ({ canvasElement }) => {
		const surface = requiredElement(canvasElement, '[data-button-surface="base"]');
		const content = requiredElement(surface, '.button-surface-content');

		await expect(surface.getBoundingClientRect().height).toBeCloseTo(48);
		await expect(surface.getBoundingClientRect().width).toBeGreaterThan(32);
		await expect(content.scrollWidth).toBeLessThanOrEqual(surface.clientWidth);
		await expect(getComputedStyle(surface).paddingInline).toBe('16px');
		await expect(getComputedStyle(surface).fontSize).toBe('16px');
		await expect(getComputedStyle(surface).lineHeight).toBe('24px');
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
		await expect(button.getBoundingClientRect().height).toBeCloseTo(40);
		await expect(getComputedStyle(button).paddingInline).toBe('8px');
		await expect(getComputedStyle(label).opacity).toBe('0');
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
		await expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0)');
	}}
/>
