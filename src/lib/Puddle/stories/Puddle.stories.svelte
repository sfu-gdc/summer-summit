<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect } from 'storybook/test';

	import Puddle from '../Puddle.svelte';
	import { waitForPaintedFraction } from '../tests/svg';
	import { puddleStoryConfig } from './storyConfig';

	type Args = ComponentProps<typeof Puddle> & {
		backgroundColor: string;
		puddleTextColor: string;
		textColor: string;
	};

	const { Story } = defineMeta<typeof template, typeof Puddle>({
		title: 'Puddle',
		component: Puddle,
		...puddleStoryConfig,
		args: {
			...puddleStoryConfig.args,
			backgroundColor: '#c7f735',
			puddleTextColor: '#ffffff',
			textColor: '#000000',
		},
		argTypes: {
			...puddleStoryConfig.argTypes,
			backgroundColor: { control: 'color' },
			puddleTextColor: { control: 'color' },
			textColor: { control: 'color' },
		},
		parameters: {
			...puddleStoryConfig.parameters,
			controls: {
				include: [
					...puddleStoryConfig.parameters.controls.include,
					'backgroundColor',
					'puddleTextColor',
					'textColor',
				],
			},
		},
	});
</script>

<script lang="ts">
	import { requestDeviceGravityPermission, type DeviceGravityPermission } from '../device';

	let devicePermission = $state<DeviceGravityPermission | 'idle'>('idle');
	const enableDeviceGravity = async () => {
		devicePermission = await requestDeviceGravityPermission();
	};
</script>

{#snippet template({ backgroundColor, puddleTextColor, textColor, ...args }: Args)}
	<div
		class="text-[var(--story-text-color)] p-12 bg-[var(--story-background-color)]"
		style:--story-background-color={backgroundColor}
		style:--puddle-text-color={puddleTextColor}
		style:--story-text-color={textColor}
	>
		<Puddle {...args} class="h-[420px] w-[760px]" />
	</div>
{/snippet}

<Story
	name="Default"
	{template}
	play={async ({ canvasElement }) => {
		const path = canvasElement.querySelector<SVGPathElement>('path[data-puddle-shape]');
		await expect(path).not.toBeNull();
		if (!path) return;
		const fraction = await waitForPaintedFraction(path, 60);
		// A puddle covers part of the box but not all of it.
		await expect(fraction).toBeGreaterThan(0.1);
		await expect(fraction).toBeLessThan(0.95);
	}}
/>

<!-- The landing-page hero: puddle behind the title. -->
{#snippet hero({ backgroundColor, puddleTextColor, textColor, ...args }: Args)}
	<div
		class="text-[var(--story-text-color)] p-12 bg-[var(--story-background-color)]"
		style:--story-background-color={backgroundColor}
		style:--puddle-text-color={puddleTextColor}
		style:--story-text-color={textColor}
	>
		<Puddle {...args} class="h-[460px] w-[820px]">
			<div class="p-10 grid inset-0 place-items-center absolute">
				<span class="text-6xl leading-[1.1] tracking-[0.04em] font-header text-center"
					>SUMMER SUMMIT<br />GAME JAM 2026</span
				>
			</div>
			<div
				aria-hidden="true"
				class="text-[var(--puddle-text-color)] p-10 grid [clip-path:var(--puddle-clip)] inset-0 place-items-center absolute"
			>
				<span class="text-6xl leading-[1.1] tracking-[0.04em] font-header text-center"
					>SUMMER SUMMIT<br />GAME JAM 2026</span
				>
			</div>
		</Puddle>
	</div>
{/snippet}

<Story name="Hero" template={hero} args={{ animated: false }} />

<!-- Opt-in ripples: raindrops disturb the settled surface, wobbling the blocky edge. -->
<Story name="Animated" {template} args={{ animated: true }} />

<!-- The momentum integrator: the pipe core plus a semi-Lagrangian inertia pass. -->
<Story name="Momentum" {template} args={{ animated: true, integrator: 'pipes+momentum' }} />

<!-- Gravity gently leans toward the pointer, so the puddle follows the cursor. -->
<Story name="Cursor" {template} args={{ animated: true, followCursor: true }} />

{#snippet device({ backgroundColor, puddleTextColor, textColor, ...args }: Args)}
	<div
		class="text-[var(--story-text-color)] p-12 bg-[var(--story-background-color)] gap-4 grid justify-items-start"
		style:--story-background-color={backgroundColor}
		style:--puddle-text-color={puddleTextColor}
		style:--story-text-color={textColor}
	>
		<button type="button" onclick={enableDeviceGravity}>Enable device motion</button>
		<span>Permission: {devicePermission}</span>
		<Puddle {...args} class="h-[420px] w-[760px]" />
	</div>
{/snippet}

<!-- Device motion requires HTTPS and, on some browsers, this explicit user gesture. -->
<Story name="Device Gravity" template={device} args={{ animated: true, deviceGravity: true }} />
