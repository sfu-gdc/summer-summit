<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps, Snippet } from 'svelte';

	import { expect, userEvent, within } from 'storybook/test';

	import ClipAwareButton from './ClipAwareButton.svelte';

	type Args = ComponentProps<typeof ClipAwareButton>;
	interface Layers {
		base: Snippet;
		inverse: Snippet;
	}

	const { Story } = defineMeta({
		title: 'Button/Clip Aware Button',
		component: ClipAwareButton,
		args: {
			appearance: 'dark',
			control: { type: 'button' },
			inverseAppearance: 'light',
			size: 'large',
		},
	});

	function bounds(element: Element) {
		const { left, top, width, height } = element.getBoundingClientRect();
		return { left, top, width, height };
	}

	async function expectMatchingBounds(first: Element, second: Element) {
		const firstBounds = bounds(first);
		const secondBounds = bounds(second);

		await expect(secondBounds.left).toBeCloseTo(firstBounds.left);
		await expect(secondBounds.top).toBeCloseTo(firstBounds.top);
		await expect(secondBounds.width).toBeCloseTo(firstBounds.width);
		await expect(secondBounds.height).toBeCloseTo(firstBounds.height);
	}
</script>

{#snippet compose(layers: Layers)}
	<div
		class="grid pointer-events-none inset-0 place-items-center absolute"
		data-story-button-layer="base"
	>
		{@render layers.base()}
	</div>
	<div
		aria-hidden="true"
		class="grid pointer-events-none inset-0 place-items-center absolute"
		data-story-button-layer="inverse"
		inert
	>
		{@render layers.inverse()}
	</div>
{/snippet}

{#snippet interactive(args: Args)}
	<div
		class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden"
		data-clip-aware-button
	>
		<ClipAwareButton {...args} {compose}>Join the jam</ClipAwareButton>
	</div>
{/snippet}

{#snippet presentation(args: Args)}
	<div
		class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden"
		data-clip-aware-button
	>
		<ClipAwareButton {...args} {compose} control={undefined}>Join the jam</ClipAwareButton>
	</div>
{/snippet}

<Story
	name="Interactive"
	template={interactive}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const host = canvasElement.querySelector<HTMLElement>('[data-clip-aware-button]');
		await expect(host).not.toBeNull();
		if (!host) return;

		const baseLayer = host.querySelector<HTMLElement>('[data-story-button-layer="base"]');
		const inverseLayer = host.querySelector<HTMLElement>('[data-story-button-layer="inverse"]');
		const baseVisual = host.querySelector<HTMLElement>('[data-clip-aware-visual="base"]');
		const inverseVisual = host.querySelector<HTMLElement>('[data-clip-aware-visual="inverse"]');
		const button = canvas.getByRole('button', { name: 'Join the jam' });
		const surfaces = host.querySelectorAll<HTMLElement>('[data-button-surface]');
		const baseSurface = baseVisual?.querySelector<HTMLElement>('[data-button-surface]');
		const inverseSurface = inverseVisual?.querySelector<HTMLElement>('[data-button-surface]');

		await expect(baseLayer).not.toBeNull();
		await expect(inverseLayer).not.toBeNull();
		await expect(baseVisual).not.toBeNull();
		await expect(inverseVisual).not.toBeNull();
		await expect(baseSurface).not.toBeNull();
		await expect(inverseSurface).not.toBeNull();
		if (
			!baseLayer ||
			!inverseLayer ||
			!baseVisual ||
			!inverseVisual ||
			!baseSurface ||
			!inverseSurface
		)
			return;

		await expect(host.querySelectorAll(':scope > .layer')).toHaveLength(0);
		await expect(surfaces).toHaveLength(2);
		await expect(canvas.getAllByRole('button', { name: 'Join the jam' })).toHaveLength(1);
		await expect(canvas.queryByRole('link', { name: 'Join the jam' })).toBeNull();
		await expect(baseVisual.closest('[data-story-button-layer]')).toBe(baseLayer);
		await expect(inverseVisual.closest('[data-story-button-layer]')).toBe(inverseLayer);
		await expect(button.closest('[data-story-button-layer]')).toBe(baseLayer);
		await expect(inverseLayer).toHaveAttribute('aria-hidden', 'true');
		await expect(inverseLayer).toHaveAttribute('inert');
		await expect(inverseSurface).toHaveAttribute('aria-hidden', 'true');
		await expect(inverseSurface).toHaveAttribute('inert');
		await expect(getComputedStyle(baseLayer).clipPath).toBe('none');
		await expect(getComputedStyle(inverseLayer).clipPath).toBe('none');
		await expect(getComputedStyle(inverseLayer).pointerEvents).toBe('none');
		await expect(getComputedStyle(button).pointerEvents).toBe('auto');
		await expect(host.style.getPropertyValue('--clip-aware-path')).toBe('');

		await expectMatchingBounds(baseSurface, inverseSurface);
		await expectMatchingBounds(baseSurface, button);

		const idleColors = [...surfaces].map((surface) => getComputedStyle(surface).color);
		host.classList.add('pseudo-hover-all');
		for (const [index, surface] of [...surfaces].entries()) {
			await expect(getComputedStyle(surface).color).not.toBe(idleColors[index]);
		}
		host.classList.remove('pseudo-hover-all');

		host.classList.add('pseudo-active-all');
		for (const visual of [baseVisual, inverseVisual]) {
			await expect(getComputedStyle(visual).transform).not.toBe('none');
		}
		host.classList.remove('pseudo-active-all');

		let activations = 0;
		button.addEventListener('click', () => {
			activations += 1;
		});

		await userEvent.click(button);
		await expect(activations).toBe(1);

		button.focus();
		await userEvent.keyboard('{Enter}');
		await expect(activations).toBe(2);

		button.blur();
		canvasElement.ownerDocument.body.focus();
		await userEvent.tab();
		await expect(button).toHaveFocus();
		host.classList.add('pseudo-focus-visible-all');
		for (const visual of [baseVisual, inverseVisual]) {
			await expect(getComputedStyle(visual).outlineColor).not.toBe('rgba(0, 0, 0, 0)');
		}
		host.classList.remove('pseudo-focus-visible-all');

		button.toggleAttribute('disabled', true);
		await expect(button).toBeDisabled();
		for (const [index, surface] of [...surfaces].entries()) {
			const style = getComputedStyle(surface);
			await expect(style.color).not.toBe(idleColors[index]);
			await expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
		}
	}}
/>

<Story
	name="Presentation Only"
	template={presentation}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const host = canvasElement.querySelector<HTMLElement>('[data-clip-aware-button]');
		await expect(host).not.toBeNull();
		if (!host) return;

		await expect(canvas.queryByRole('button', { name: 'Join the jam' })).not.toBeInTheDocument();
		await expect(canvas.queryByRole('link', { name: 'Join the jam' })).not.toBeInTheDocument();
		await expect(host.querySelectorAll('[data-clip-aware-visual]')).toHaveLength(2);
		await expect(host.querySelectorAll('[data-button-surface]')).toHaveLength(2);
		await expect(host.querySelector('.semantic-control')).toBeNull();
	}}
/>

<Story
	name="Anchor"
	template={interactive}
	args={{ control: { href: '#join', rel: 'external', target: '_blank' } }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const link = canvas.getByRole('link', { name: 'Join the jam' });
		const host = canvasElement.querySelector<HTMLElement>('[data-clip-aware-button]');

		await expect(host).not.toBeNull();
		if (!host) return;

		await expect(canvas.queryByRole('button', { name: 'Join the jam' })).toBeNull();
		await expect(canvas.getAllByRole('link', { name: 'Join the jam' })).toHaveLength(1);
		await expect(link).toHaveAttribute('href', '#join');
		await expect(link).toHaveAttribute('rel', 'external');
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(getComputedStyle(link).pointerEvents).toBe('auto');
		await expect(host.querySelectorAll('[data-button-surface]')).toHaveLength(2);
	}}
/>
