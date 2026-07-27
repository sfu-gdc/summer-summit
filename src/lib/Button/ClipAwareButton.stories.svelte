<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect, userEvent, waitFor, within } from 'storybook/test';

	import ClipAwareButton from './ClipAwareButton.svelte';

	type Args = Omit<ComponentProps<typeof ClipAwareButton>, 'compose' | 'layer'>;

	const { Story } = defineMeta({
		title: 'Button/Clip Aware Button',
		component: ClipAwareButton,
		args: {
			appearance: 'dark',
			control: { type: 'button' },
			inverseAppearance: 'light',
			layer: 'base',
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

	function transformScale(transform: string) {
		if (transform === 'none') return 1;

		const matrix = new DOMMatrixReadOnly(transform);
		return Math.hypot(matrix.a, matrix.b);
	}
</script>

{#snippet interactive(args: Args)}
	<div
		class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden"
		data-clip-aware-button
	>
		<div
			class="grid pointer-events-none inset-0 place-items-center absolute"
			data-story-button-layer="base"
		>
			<ClipAwareButton {...args} layer="base">Join the jam</ClipAwareButton>
		</div>
		<div
			aria-hidden="true"
			class="grid pointer-events-none inset-0 place-items-center absolute"
			data-story-button-layer="inverse"
			inert
		>
			<ClipAwareButton {...args} control={undefined} layer="inverse">Join the jam</ClipAwareButton>
		</div>
	</div>
{/snippet}

{#snippet presentation(args: Args)}
	<div
		class="bg-brand-primary-100 h-72 max-w-full w-120 relative overflow-hidden"
		data-clip-aware-button
	>
		<div
			class="grid pointer-events-none inset-0 place-items-center absolute"
			data-story-button-layer="base"
		>
			<ClipAwareButton {...args} control={undefined} layer="base">Join the jam</ClipAwareButton>
		</div>
		<div
			aria-hidden="true"
			class="grid pointer-events-none inset-0 place-items-center absolute"
			data-story-button-layer="inverse"
			inert
		>
			<ClipAwareButton {...args} control={undefined} layer="inverse">Join the jam</ClipAwareButton>
		</div>
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

		const idleTransforms = [...surfaces].map((surface) => getComputedStyle(surface).transform);
		host.classList.add('pseudo-hover-all');
		await waitFor(async () => {
			const hoverTransforms = [...surfaces].map((surface) => getComputedStyle(surface).transform);

			await expect(hoverTransforms[1]).toBe(hoverTransforms[0]);
			for (const [index, transform] of hoverTransforms.entries()) {
				const idleTransform = idleTransforms[index];
				if (idleTransform === undefined) throw new Error('Missing idle surface transform');

				await expect(transformScale(transform)).toBeGreaterThan(transformScale(idleTransform));
			}
		});
		host.classList.remove('pseudo-hover-all');
		await waitFor(async () => {
			const resetTransforms = [...surfaces].map((surface) => getComputedStyle(surface).transform);

			await expect(resetTransforms).toEqual(idleTransforms);
		});

		host.classList.add('pseudo-active-all');
		const activeTransforms = [baseVisual, inverseVisual].map(
			(visual) => getComputedStyle(visual).transform,
		);
		await expect(activeTransforms[0]).not.toBe('none');
		await expect(activeTransforms[1]).toBe(activeTransforms[0]);
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
