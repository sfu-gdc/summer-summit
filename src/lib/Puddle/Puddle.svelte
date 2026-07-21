<script lang="ts">
	import { PUDDLE_DEFAULTS, type PuddleProps } from './config';
	import { resolvePuddleCssColors } from './render/color';
	import { createPuddleRuntime } from './runtime/puddleRuntime.svelte';

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

	const cssColors = $derived(resolvePuddleCssColors(color));

	const instanceId = $props.id();
	const shapeId = `${instanceId}-puddle-shape`;
	const clipId = `${instanceId}-puddle-clip`;
	// Full-host descendant overlays can reuse the silhouette with `clip-path: var(--puddle-clip)`.
	const clipUrl = `url("#${clipId}")`;

	const runtime = createPuddleRuntime({
		getGeometryOptions: () => ({ cellSize, maxCells }),
		getSimulationOptions: () => ({
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
			rainInterval,
			rainAmount,
			rainRadius,
		}),
		getSettleSubsteps: () => settleSubsteps,
		getThreshold: () => threshold,
		getAnimated: () => animated,
		getFollowCursor: () => followCursor,
		getCursorTilt: () => cursorTilt,
		getCursorEase: () => cursorEase,
		getDeviceGravity: () => deviceGravity,
		getDeviceTilt: () => deviceTilt,
		getDeviceEase: () => deviceEase,
		getDeviceNeutralWindow: () => deviceNeutralWindow,
	});
</script>

<svelte:window
	onpointermove={runtime.followCursor ? runtime.onPointerMove : undefined}
	onblur={runtime.followCursor ? runtime.clearPointer : undefined}
	ondevicemotion={runtime.deviceMotionEnabled ? runtime.onDeviceMotion : undefined}
/>
<svelte:document
	onmouseleave={runtime.followCursor ? runtime.clearPointer : undefined}
	onvisibilitychange={runtime.deviceGravity ? runtime.onVisibilityChange : undefined}
/>

<div
	bind:this={runtime.host}
	class={['host', className]}
	{...rest}
	style:--puddle-color={cssColors.srgb}
	style:--puddle-color-wide={cssColors.p3}
	style:--puddle-clip={clipUrl}
>
	<div class="fallback" class:painted={runtime.painted} aria-hidden="true"></div>
	<svg class="renderer" viewBox={runtime.viewBox} preserveAspectRatio="none" aria-hidden="true">
		<defs>
			<clipPath id={clipId} clipPathUnits="objectBoundingBox">
				<use href={`#${shapeId}`} transform={runtime.clipTransform}></use>
			</clipPath>
		</defs>
		<path bind:this={runtime.shape} id={shapeId} class="shape"></path>
	</svg>
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
	.renderer {
		shape-rendering: crispEdges;
	}
	.shape {
		fill: var(--puddle-color, #141414);
	}

	/* No-JS backdrop: a plain rounded block in the puddle color until the sim paints. */
	.fallback {
		background: var(--puddle-color, #141414);
		border-radius: 12%/20%;
	}
	@supports (color: color(display-p3 1 0 0)) {
		.fallback {
			background: var(--puddle-color-wide, var(--puddle-color, #141414));
		}
		.shape {
			fill: var(--puddle-color-wide, var(--puddle-color, #141414));
		}
	}
	.fallback.painted {
		display: none;
	}
</style>
