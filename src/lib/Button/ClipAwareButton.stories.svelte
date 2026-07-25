<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps, Snippet } from 'svelte';

	import { expect, userEvent, within } from 'storybook/test';

	import ClipAwareButton from './ClipAwareButton.svelte';

	type Args = ComponentProps<typeof ClipAwareButton>;

	const { Story } = defineMeta({
		title: 'Button/Clip Aware Button',
		component: ClipAwareButton,
		args: {
			appearance: 'dark',
			clipPath: 'inset(0 0 0 50%)',
			control: { type: 'button' },
			inverseAppearance: 'light',
			size: 'large',
		},
	});
</script>

{#snippet placement(content: Snippet)}
	<div class="transform-translate-x--1/2 transform-translate-y--1/2 left-1/2 top-1/2 absolute">
		{@render content()}
	</div>
{/snippet}

{#snippet interactive(args: Args)}
	<div class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden">
		<ClipAwareButton {...args} {placement}>Join the jam</ClipAwareButton>
	</div>
{/snippet}

{#snippet presentation(args: Args)}
	<div class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden">
		<ClipAwareButton {...args} control={undefined} {placement}>Join the jam</ClipAwareButton>
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

		const layers = host.querySelectorAll<HTMLElement>(':scope > .layer');
		const visualStates = host.querySelectorAll<HTMLElement>('[data-clip-aware-visual]');
		const button = canvas.getByRole('button', { name: 'Join the jam' });
		const surfaces = host.querySelectorAll<HTMLElement>('[data-button-surface]');
		const inverseLayer = host.querySelector<HTMLElement>('.inverse-layer');
		await expect(inverseLayer).not.toBeNull();
		if (!inverseLayer) return;

		await expect(layers).toHaveLength(3);
		await expect(visualStates).toHaveLength(2);
		await expect(surfaces).toHaveLength(2);
		await expect(canvas.getAllByRole('button', { name: 'Join the jam' })).toHaveLength(1);
		await expect(inverseLayer).toHaveAttribute('aria-hidden', 'true');
		await expect(inverseLayer).toHaveAttribute('inert');
		await expect(getComputedStyle(inverseLayer).pointerEvents).toBe('none');
		await expect(getComputedStyle(inverseLayer).clipPath).toBe('inset(0px 0px 0px 50%)');

		const hostRect = host.getBoundingClientRect();
		const inverseRect = inverseLayer.getBoundingClientRect();
		await expect(inverseRect.left).toBeCloseTo(hostRect.left);
		await expect(inverseRect.top).toBeCloseTo(hostRect.top);
		await expect(inverseRect.width).toBeCloseTo(hostRect.width);
		await expect(inverseRect.height).toBeCloseTo(hostRect.height);

		const idleColors = [...surfaces].map((surface) => getComputedStyle(surface).color);
		host.classList.add('pseudo-hover-all');
		for (const [index, surface] of [...surfaces].entries()) {
			await expect(getComputedStyle(surface).color).not.toBe(idleColors[index]);
		}
		host.classList.remove('pseudo-hover-all');

		host.classList.add('pseudo-active-all');
		for (const visualState of visualStates) {
			await expect(getComputedStyle(visualState).transform).not.toBe('none');
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
		for (const visualState of visualStates) {
			await expect(getComputedStyle(visualState).outlineColor).not.toBe('rgba(0, 0, 0, 0)');
		}
		host.classList.remove('pseudo-focus-visible-all');

		button.toggleAttribute('disabled', true);
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
		await expect(host.querySelector('.control-layer')).toBeNull();
	}}
/>
