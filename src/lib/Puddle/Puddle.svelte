<script lang="ts">
	import { formatCss } from 'culori';

	import { PUDDLE_DEFAULTS, type PuddleProps } from './config';
	import { createPuddleRuntime } from './runtime/puddleRuntime.svelte';

	const {
		color = PUDDLE_DEFAULTS.color,
		cellSize = PUDDLE_DEFAULTS.cellSize,
		threshold = PUDDLE_DEFAULTS.threshold,
		level = PUDDLE_DEFAULTS.level,
		seed = PUDDLE_DEFAULTS.seed,
		noiseAmp = PUDDLE_DEFAULTS.noiseAmp,
		bowlWidth = PUDDLE_DEFAULTS.bowlWidth,
		bowlHeight = PUDDLE_DEFAULTS.bowlHeight,
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
		class: className,
		children,
		...rest
	}: PuddleProps = $props();

	const cssColor = $derived(typeof color === 'string' ? color : formatCss(color));

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
			bowlWidth,
			bowlHeight,
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
	class={['relative isolate', className]}
	{...rest}
	data-puddle-host
	style:--puddle-color={cssColor}
	style:--puddle-clip={clipUrl}
>
	<div
		class={[
			'pointer-events-none absolute inset-0 -z-1 block h-full w-full rounded-[12%/20%] bg-[var(--puddle-color,#141414)]',
			{ hidden: runtime.painted },
		]}
		data-puddle-fallback
		aria-hidden="true"
	></div>
	<svg
		class="h-full w-full block pointer-events-none [shape-rendering:crispEdges] inset-0 absolute -z-1"
		data-puddle-renderer
		viewBox={runtime.viewBox}
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<defs>
			<clipPath id={clipId} clipPathUnits="objectBoundingBox">
				<use href={`#${shapeId}`} transform={runtime.clipTransform}></use>
			</clipPath>
		</defs>
		<path
			bind:this={runtime.shape}
			id={shapeId}
			class="fill-[var(--puddle-color,#141414)]"
			data-puddle-shape
		></path>
	</svg>
	{@render children?.()}
</div>
