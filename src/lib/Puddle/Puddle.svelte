<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { formatCss, rgb } from 'culori';
	import { ElementSize } from 'runed';

	import { browser } from '$app/environment';

	import { PUDDLE_DEFAULTS, type PuddleProps } from './config';
	import { createDeviceGravityEstimator } from './device';
	import { createPuddleRenderer } from './render/puddleRenderer';
	import { startPuddleLoop } from './runtime/puddleLoop';
	import { createWaterSim } from './waterSim';

	const {
		color = PUDDLE_DEFAULTS.color,
		cellSize = PUDDLE_DEFAULTS.cellSize,
		threshold = PUDDLE_DEFAULTS.threshold,
		level = PUDDLE_DEFAULTS.level,
		seed = PUDDLE_DEFAULTS.seed,
		noiseAmp = PUDDLE_DEFAULTS.noiseAmp,
		animated = PUDDLE_DEFAULTS.animated,
		followCursor = PUDDLE_DEFAULTS.followCursor,
		integrator = PUDDLE_DEFAULTS.integrator,
		momentumSmoothing = PUDDLE_DEFAULTS.momentumSmoothing,
		momentumRetention = PUDDLE_DEFAULTS.momentumRetention,
		timeScale = PUDDLE_DEFAULTS.timeScale,
		baseSubstep = PUDDLE_DEFAULTS.baseSubstep,
		maxSubsteps = PUDDLE_DEFAULTS.maxSubsteps,
		cflSafety = PUDDLE_DEFAULTS.cflSafety,
		minWaveDepth = PUDDLE_DEFAULTS.minWaveDepth,
		settleSubsteps = PUDDLE_DEFAULTS.settleSubsteps,
		gravityDrift = PUDDLE_DEFAULTS.gravityDrift,
		driftAmp = PUDDLE_DEFAULTS.driftAmp,
		driftRateHz = PUDDLE_DEFAULTS.driftRateHz,
		rainInterval = PUDDLE_DEFAULTS.rainInterval,
		rainAmount = PUDDLE_DEFAULTS.rainAmount,
		rainRadius = PUDDLE_DEFAULTS.rainRadius,
		maxCells = PUDDLE_DEFAULTS.maxCells,
		cursorTilt = PUDDLE_DEFAULTS.cursorTilt,
		cursorEase = PUDDLE_DEFAULTS.cursorEase,
		deviceGravity = PUDDLE_DEFAULTS.deviceGravity,
		deviceTilt = PUDDLE_DEFAULTS.deviceTilt,
		deviceEase = PUDDLE_DEFAULTS.deviceEase,
		deviceNeutralWindow = PUDDLE_DEFAULTS.deviceNeutralWindow,
		class: className,
		children,
		...rest
	}: PuddleProps = $props();

	// Sanitize the color once via rgb(), which converts Color objects as well as
	// CSS strings (parse() is string-only and would drop objects to the fallback).
	const colorObj = $derived(rgb(color) ?? { mode: 'rgb' as const, r: 0.08, g: 0.08, b: 0.08 });
	// SSR'd onto the fallback so the no-JS backdrop keeps the puddle color.
	const cssColor = $derived(formatCss(colorObj));

	let canvas = $state<HTMLCanvasElement | null>(null);
	let host = $state<HTMLElement | null>(null);
	const hostSize = new ElementSize(() => host);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const renderer = createPuddleRenderer();
	const deviceGravityEstimator = createDeviceGravityEstimator();
	const deviceNeutralSeconds = $derived(
		Number.isFinite(deviceNeutralWindow) && deviceNeutralWindow >= 0
			? Math.min(deviceNeutralWindow, 60)
			: PUDDLE_DEFAULTS.deviceNeutralWindow,
	);

	// Stays false without JS, keeping the CSS fallback backdrop visible.
	let painted = $state(false);
	let pointer: { x: number; y: number } | null = null;
	const onPointerMove = (event: PointerEvent) => {
		pointer = { x: event.clientX, y: event.clientY };
	};
	const clearPointer = () => {
		pointer = null;
	};
	const onDeviceMotion = (event: DeviceMotionEvent) => {
		deviceGravityEstimator.update(event, performance.now(), deviceNeutralSeconds);
	};
	const onVisibilityChange = () => {
		if (document.hidden) deviceGravityEstimator.reset();
	};
	const screenAngle = () =>
		(screen as unknown as { orientation?: { angle?: number } }).orientation?.angle ?? 0;

	const dpr = $derived(devicePixelRatio.current ?? 1);
	const cellCap = $derived(
		Number.isFinite(maxCells) && maxCells >= 1 ? Math.floor(maxCells) : PUDDLE_DEFAULTS.maxCells,
	);
	const cell = $derived(
		Number.isFinite(cellSize) && cellSize >= 1 ? cellSize : PUDDLE_DEFAULTS.cellSize,
	);
	const cols = $derived(
		hostSize.width > 0 ? Math.min(cellCap, Math.max(8, Math.round(hostSize.width / cell))) : 0,
	);
	const rows = $derived(
		hostSize.height > 0 ? Math.min(cellCap, Math.max(6, Math.round(hostSize.height / cell))) : 0,
	);

	const sim = $derived.by(() => {
		if (!browser || cols === 0 || rows === 0) return null;
		return createWaterSim({
			nx: cols,
			ny: rows,
			seed,
			level,
			noiseAmp,
			integrator,
			momentumSmoothing,
			momentumRetention,
			timeScale,
			baseSubstep,
			cflSafety,
			minWaveDepth,
			maxSubsteps,
			gravityDrift,
			driftAmp,
			driftRateHz,
			rain: { intervalSec: rainInterval, amount: rainAmount, radius: rainRadius },
		});
	});

	$effect(() => {
		sim?.settle(settleSubsteps);
	});

	$effect(() => {
		if (!browser || !canvas || !host || !sim || hostSize.width === 0 || hostSize.height === 0)
			return;
		const target = canvas;
		const element = host;
		const water = sim;
		const cssW = hostSize.width;
		const cssH = hostSize.height;
		const pixelRatio = dpr;
		const depthThreshold = threshold;
		const fillColor = colorObj;
		const follow = followCursor;
		const tiltStrength = cursorTilt;
		const tiltTau = cursorEase;
		const followDevice = deviceGravity;
		const deviceStrength = deviceTilt;
		const deviceTau = deviceEase;
		const neutralWindow = deviceNeutralSeconds;
		const draw = () => {
			painted = renderer.render(target, {
				nx: water.nx,
				ny: water.ny,
				height: water.height,
				cssW,
				cssH,
				dpr: pixelRatio,
				threshold: depthThreshold,
				color: fillColor,
			});
		};

		draw();
		if (!animated || reducedMotion.current) return;
		return startPuddleLoop({
			host: element,
			sim: water,
			deviceGravityEstimator,
			draw,
			getPointer: () => pointer,
			followCursor: follow,
			cursorTilt: tiltStrength,
			cursorEase: tiltTau,
			deviceGravity: followDevice,
			deviceTilt: deviceStrength,
			deviceEase: deviceTau,
			deviceNeutralWindow: neutralWindow,
			screenAngle,
		});
	});
</script>

<svelte:window
	onpointermove={followCursor ? onPointerMove : undefined}
	onblur={followCursor ? clearPointer : undefined}
	ondevicemotion={deviceGravity && animated && !reducedMotion.current ? onDeviceMotion : undefined}
/>
<svelte:document
	onmouseleave={followCursor ? clearPointer : undefined}
	onvisibilitychange={deviceGravity ? onVisibilityChange : undefined}
/>

<div bind:this={host} class={['host', className]} {...rest}>
	<div class="fallback" class:painted style:--puddle-color={cssColor} aria-hidden="true"></div>
	<canvas bind:this={canvas} class="renderer" aria-hidden="true"></canvas>
	{@render children?.()}
</div>

<style>
	.host {
		position: relative;
		isolation: isolate;
	}

	.renderer,
	.fallback {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: -1;
	}

	/* No-JS backdrop: a plain rounded block in the puddle color until the sim paints. */
	.fallback {
		background: var(--puddle-color, #141414);
		border-radius: 12%/20%;
	}
	.fallback.painted {
		display: none;
	}
</style>
