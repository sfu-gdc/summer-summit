<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect } from 'storybook/test';

	import { brandColors } from '$lib/tokens';

	import Puddle from './Puddle.svelte';
	import { PUDDLE_DEFAULTS } from './waterSim';

	type Args = ComponentProps<typeof Puddle>;

	const nextFrame = () =>
		new Promise((r) => void requestAnimationFrame(() => void requestAnimationFrame(r)));

	// Fraction of the canvas that is painted (non-transparent). A real puddle
	// covers a chunk of the box but leaves green around it, so the fraction lands
	// between "nothing rendered" and "the whole box is black".
	function paintedFraction(canvas: HTMLCanvasElement): number {
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx || canvas.width === 0 || canvas.height === 0) return 0;
		const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		let n = 0;
		for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++;
		return n / (canvas.width * canvas.height);
	}

	const { Story } = defineMeta({
		title: 'Puddle',
		component: Puddle,
		args: {
			color: brandColors.shade['950'],
			...PUDDLE_DEFAULTS,
			seed: 7,
			noiseAmp: 0.4,
			animated: false,
			followCursor: false,
			timeScale: 6,
			baseSubstep: 0.08,
			maxSubsteps: 8,
			cflSafety: 0.9,
			minWaveDepth: 0.001,
			settleSubsteps: 90,
			driftRateHz: 0.05,
			rainInterval: 0.6,
			rainAmount: 0.06,
			rainRadius: 1.5,
			maxCells: 200,
			deviceGravity: false,
			deviceTilt: 6,
			deviceEase: 0.18,
			deviceNeutralWindow: 2,
		},
		argTypes: {
			cellSize: { control: { type: 'range', min: 12, max: 60, step: 1 } },
			threshold: { control: { type: 'range', min: 0.005, max: 0.3, step: 0.005 } },
			level: { control: { type: 'range', min: 0.3, max: 1, step: 0.02 } },
			seed: { control: { type: 'range', min: 1, max: 40, step: 1 } },
			noiseAmp: { control: { type: 'range', min: 0, max: 0.8, step: 0.02 } },
			animated: { control: 'boolean' },
			followCursor: { control: 'boolean' },
			integrator: { control: 'radio', options: ['pipes', 'pipes+momentum'] },
			momentumSmoothing: { control: { type: 'range', min: 0, max: 1, step: 0.02 } },
			momentumRetention: { control: { type: 'range', min: 0, max: 1, step: 0.02 } },
			timeScale: { control: { type: 'range', min: 0.5, max: 20, step: 0.5 } },
			baseSubstep: { control: { type: 'range', min: 0.02, max: 0.2, step: 0.005 } },
			maxSubsteps: { control: { type: 'range', min: 1, max: 16, step: 1 } },
			cflSafety: { control: { type: 'range', min: 0.3, max: 1, step: 0.02 } },
			minWaveDepth: { control: { type: 'range', min: 0.0001, max: 0.05, step: 0.0005 } },
			settleSubsteps: { control: { type: 'range', min: 0, max: 200, step: 10 } },
			gravityDrift: { control: 'boolean' },
			driftAmp: { control: { type: 'range', min: 0, max: 8, step: 0.5 } },
			driftRateHz: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
			rainInterval: { control: { type: 'range', min: 0.1, max: 3, step: 0.1 } },
			rainAmount: { control: { type: 'range', min: 0, max: 0.3, step: 0.01 } },
			rainRadius: { control: { type: 'range', min: 0.5, max: 5, step: 0.5 } },
			maxCells: { control: { type: 'range', min: 20, max: 200, step: 10 } },
			cursorTilt: { control: { type: 'range', min: 0, max: 2, step: 0.1 } },
			cursorEase: { control: { type: 'range', min: 0.05, max: 1.5, step: 0.05 } },
			deviceGravity: { control: 'boolean' },
			deviceTilt: { control: { type: 'range', min: 0, max: 12, step: 0.5 } },
			deviceEase: { control: { type: 'range', min: 0.05, max: 1.5, step: 0.05 } },
			deviceNeutralWindow: { control: { type: 'range', min: 0, max: 10, step: 0.25 } },
			color: { control: 'color' },
		},
		parameters: {
			backgrounds: { default: 'lime', values: [{ name: 'lime', value: '#c7f735' }] },
			controls: {
				include: [
					'color',
					'cellSize',
					'threshold',
					'level',
					'seed',
					'noiseAmp',
					'animated',
					'followCursor',
					'integrator',
					'momentumSmoothing',
					'momentumRetention',
					'timeScale',
					'baseSubstep',
					'maxSubsteps',
					'cflSafety',
					'minWaveDepth',
					'settleSubsteps',
					'gravityDrift',
					'driftAmp',
					'driftRateHz',
					'rainInterval',
					'rainAmount',
					'rainRadius',
					'maxCells',
					'cursorTilt',
					'cursorEase',
					'deviceGravity',
					'deviceTilt',
					'deviceEase',
					'deviceNeutralWindow',
				],
			},
		},
	});
</script>

<script lang="ts">
	import { requestDeviceGravityPermission, type DeviceGravityPermission } from './deviceGravity';

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
		const canvas = canvasElement.querySelector('canvas');
		await expect(canvas).not.toBeNull();
		if (!canvas) return;
		let frac = 0;
		for (let i = 0; i < 60; i++) {
			frac = paintedFraction(canvas);
			if (frac > 0) break;
			await nextFrame();
		}
		// A puddle covers part of the box but not all of it.
		await expect(frac).toBeGreaterThan(0.1);
		await expect(frac).toBeLessThan(0.95);
	}}
/>

<!-- The landing-page hero: puddle behind the title. -->
{#snippet hero(args: Args)}
	<div style="background:#c7f735; padding:48px;">
		<Puddle
			{...args}
			style="width: 820px; height: 460px; display:grid; place-items:center; padding:40px;"
		>
			<span
				style="color:white; font-family: Syncopate, sans-serif; font-weight:700; font-size:44px; line-height:1.1; text-align:center; letter-spacing:0.04em;"
				>SUMMER SUMMIT<br />GAME JAM 2026</span
			>
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
