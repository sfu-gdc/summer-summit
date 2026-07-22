<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect } from 'storybook/test';

	import Puddle from '../Puddle.svelte';
	import { waitForPaintedFraction } from '../tests/svg';
	import { puddleStoryConfig } from './storyConfig';

	type Args = ComponentProps<typeof Puddle>;

	const { Story } = defineMeta({
		title: 'Puddle',
		component: Puddle,
		...puddleStoryConfig,
	});
</script>

<script lang="ts">
	import { requestDeviceGravityPermission, type DeviceGravityPermission } from '../device';

	let devicePermission = $state<DeviceGravityPermission | 'idle'>('idle');
	const enableDeviceGravity = async () => {
		devicePermission = await requestDeviceGravityPermission();
	};
</script>

{#snippet template(args: Args)}
	<div style="background:#c7f735; padding:48px;">
		<Puddle {...args} style="width: 760px; height: 420px;" />
	</div>
{/snippet}

<Story
	name="Default"
	{template}
	play={async ({ canvasElement }) => {
		const path = canvasElement.querySelector<SVGPathElement>('path.shape');
		await expect(path).not.toBeNull();
		if (!path) return;
		const fraction = await waitForPaintedFraction(path, 60);
		// A puddle covers part of the box but not all of it.
		await expect(fraction).toBeGreaterThan(0.1);
		await expect(fraction).toBeLessThan(0.95);
	}}
/>

<!-- The landing-page hero: puddle behind the title. -->
{#snippet hero(args: Args)}
	<div style="background:#c7f735; padding:48px;">
		<Puddle {...args} style="width: 820px; height: 460px;">
			<div style="position:absolute; inset:0; display:grid; place-items:center; padding:40px;">
				<span
					style="color:black; font-family: Syncopate, sans-serif; font-weight:700; font-size:44px; line-height:1.1; text-align:center; letter-spacing:0.04em;"
					>SUMMER SUMMIT<br />GAME JAM 2026</span
				>
			</div>
			<div
				aria-hidden="true"
				style="position:absolute; inset:0; display:grid; place-items:center; padding:40px; clip-path:var(--puddle-clip);"
			>
				<span
					style="color:white; font-family: Syncopate, sans-serif; font-weight:700; font-size:44px; line-height:1.1; text-align:center; letter-spacing:0.04em;"
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

{#snippet device(args: Args)}
	<div style="background:#c7f735; padding:48px; display:grid; gap:16px; justify-items:start;">
		<button type="button" onclick={enableDeviceGravity}>Enable device motion</button>
		<span>Permission: {devicePermission}</span>
		<Puddle {...args} style="width: 760px; height: 420px;" />
	</div>
{/snippet}

<!-- Device motion requires HTTPS and, on some browsers, this explicit user gesture. -->
<Story name="Device Gravity" template={device} args={{ animated: true, deviceGravity: true }} />
