<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { Component, ComponentProps } from 'svelte';

	import { expect } from 'storybook/test';

	import { Puddle } from '$lib';
	import { heroColors } from '$lib/tokens';

	import { puddleStoryConfig } from '../Puddle/stories/storyConfig';
	import Hero from './Hero.svelte';

	type Args = ComponentProps<typeof Hero>;

	const { Story } = defineMeta<typeof template, Component>({
		title: 'Hero',
		component: Hero,
		subcomponents: { Puddle },
		args: {
			...puddleStoryConfig.args,
		},
		argTypes: {
			...puddleStoryConfig.argTypes,
		},
		parameters: {
			...puddleStoryConfig.parameters,
			layout: 'fullscreen',
		},
	});
</script>

{#snippet template(args: Args)}
	{#snippet controls()}
		<span class="sr-only" data-hero-control-probe>Controls render once</span>
	{/snippet}

	<Hero {...args} {controls} class="h-screen">
		<div class="flex flex-col h-full place-content-center place-items-center">
			<div
				class="text-6xl leading-16 tracking-wide font-header text-center"
				data-hero-content-probe
			>
				SUMMER SUMMIT<br />GAME JAM 2026
			</div>
			<div class="px-10 flex max-w-4xl w-full items-baseline justify-between">
				<span class="text-xl font-semibold">SEPT 4 - 6</span>
				<div></div>
			</div>
		</div>
	</Hero>
{/snippet}

<Story
	name="Default"
	{template}
	play={async ({ canvasElement }) => {
		const hero = canvasElement.querySelector<HTMLElement>('[data-hero]');
		const baseContent = canvasElement.querySelector<HTMLElement>('[data-hero-content]');
		const overlayContent = canvasElement.querySelector<HTMLElement>('[data-hero-content-overlay]');
		const controls = canvasElement.querySelector<HTMLElement>('[data-hero-controls]');

		await expect(hero).not.toBeNull();
		await expect(controls).not.toBeNull();
		await expect(baseContent?.querySelectorAll('[data-hero-content-probe]')).toHaveLength(1);
		await expect(overlayContent?.querySelectorAll('[data-hero-content-probe]')).toHaveLength(1);
		await expect(overlayContent).toHaveAttribute('aria-hidden', 'true');
		await expect(overlayContent).toHaveAttribute('inert');
		if (!overlayContent || !controls) return;
		await expect(getComputedStyle(overlayContent).pointerEvents).toBe('none');
		await expect(getComputedStyle(controls).pointerEvents).toBe('none');
		await expect(canvasElement.querySelectorAll('[data-hero-control-probe]')).toHaveLength(1);

		await expect(hero?.style.getPropertyValue('--hero-background-color')).toBe(
			heroColors.background,
		);
		await expect(hero?.style.getPropertyValue('--hero-text-color')).toBe(heroColors.content);
		await expect(hero?.style.getPropertyValue('--hero-outline-color')).toBe(heroColors.outline);
		await expect(hero?.style.getPropertyValue('--hero-puddle-text-color')).toBe(
			heroColors.inverseContent,
		);
	}}
/>

{#snippet inverseTemplate(args: Args)}
	{#snippet inverseChildren()}
		<div class="flex h-full items-center justify-center" data-hero-inverse-probe>
			Inverse content
		</div>
	{/snippet}

	<Hero {...args} {inverseChildren} class="h-screen">
		<div class="flex h-full items-center justify-center" data-hero-base-probe>Base content</div>
	</Hero>
{/snippet}

<Story
	name="Distinct Inverse Content"
	template={inverseTemplate}
	play={async ({ canvasElement }) => {
		const baseContent = canvasElement.querySelector<HTMLElement>('[data-hero-content]');
		const overlayContent = canvasElement.querySelector<HTMLElement>('[data-hero-content-overlay]');

		await expect(baseContent?.querySelectorAll('[data-hero-base-probe]')).toHaveLength(1);
		await expect(baseContent?.querySelectorAll('[data-hero-inverse-probe]')).toHaveLength(0);
		await expect(overlayContent?.querySelectorAll('[data-hero-base-probe]')).toHaveLength(0);
		await expect(overlayContent?.querySelectorAll('[data-hero-inverse-probe]')).toHaveLength(1);
	}}
/>
