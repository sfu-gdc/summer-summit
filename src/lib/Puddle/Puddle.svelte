<script lang="ts">
	import { formatCss } from 'culori';

	import { asset } from '$app/paths';

	import { PUDDLE_DEFAULTS, type PuddleProps } from './config';
	import { PUDDLE_SNAPSHOTS } from './generated/puddleSnapshots';
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
		bowlAmp = PUDDLE_DEFAULTS.bowlAmp,
		bowlRim = PUDDLE_DEFAULTS.bowlRim,
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
		snapshot = 'default',
		responsiveSnapshots = false,
		clippedChildren,
		class: className,
		children,
		...rest
	}: PuddleProps = $props();

	const cssColor = $derived(typeof color === 'string' ? color : formatCss(color));
	const initialSnapshot = $derived(PUDDLE_SNAPSHOTS[snapshot]);

	const instanceId = $props.id();
	const shapeId = `${instanceId}-puddle-shape`;
	const clipId = `${instanceId}-puddle-clip`;
	const clipUrl = `url("#${clipId}")`;
	const responsiveSnapshotNames = ['compact', 'medium', 'expanded', 'large'] as const;
	const staticShapeId = (name: (typeof responsiveSnapshotNames)[number]) =>
		`${instanceId}-puddle-static-${name}-shape`;

	const runtime = createPuddleRuntime({
		getInitialSnapshot: () => initialSnapshot,
		getSnapshotUrl: () => asset(initialSnapshot.url),
		getGeometryOptions: () => ({ cellSize, maxCells }),
		getSimulationOptions: () => ({
			seed,
			level,
			noiseAmp,
			bowlWidth,
			bowlHeight,
			bowlAmp,
			bowlRim,
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
	class={['relative isolate', { 'responsive-puddle': responsiveSnapshots }, className]}
	{...rest}
	data-puddle-host
	data-puddle-live={runtime.live ? true : undefined}
	style:--puddle-color={cssColor}
	style:--puddle-clip={runtime.live
		? clipUrl
		: responsiveSnapshots
			? undefined
			: PUDDLE_SNAPSHOTS[snapshot].clip}
	style:--puddle-clip-compact={PUDDLE_SNAPSHOTS.compact.clip}
	style:--puddle-clip-medium={PUDDLE_SNAPSHOTS.medium.clip}
	style:--puddle-clip-expanded={PUDDLE_SNAPSHOTS.expanded.clip}
	style:--puddle-clip-large={PUDDLE_SNAPSHOTS.large.clip}
>
	<div
		class={[
			'pointer-events-none absolute inset-0 -z-1 h-full w-full rounded-[12%/20%] bg-[var(--puddle-color,#141414)]',
			{ hidden: runtime.painted },
		]}
		data-puddle-fallback
		aria-hidden="true"
	></div>
	<svg
		x="0"
		y="0"
		width="100%"
		height="100%"
		class="puddle-live h-full w-full block pointer-events-none [shape-rendering:crispEdges] inset-0 absolute -z-1"
		data-puddle-renderer
		data-puddle-cols={runtime.cols}
		data-puddle-rows={runtime.rows}
		data-puddle-cell-size={runtime.cellSize}
		aria-hidden="true"
	>
		<defs>
			<path
				id={shapeId}
				d={runtime.path}
				class="fill-[var(--puddle-color,#141414)]"
				data-puddle-shape
			></path>
			<clipPath id={clipId} clipPathUnits="userSpaceOnUse">
				<path d={runtime.path} transform={runtime.clipTransform} data-puddle-clip-shape></path>
			</clipPath>
		</defs>
		<use
			href={`#${shapeId}`}
			style:transform={runtime.centerTransform}
			style:transform-box="view-box"
			class="fill-[var(--puddle-color,#141414)]"
			data-puddle-visible-shape
		></use>
	</svg>
	{#if responsiveSnapshots}
		{#each responsiveSnapshotNames as name (name)}
			{@const staticSnapshot = PUDDLE_SNAPSHOTS[name]}
			{@const staticTransform = `translate(50%, 50%) translate(${((-staticSnapshot.nx * staticSnapshot.cellSize) / 2).toString()}px, ${((-staticSnapshot.ny * staticSnapshot.cellSize) / 2).toString()}px)`}
			<svg
				class={`puddle-static puddle-static-${name} h-full w-full pointer-events-none [shape-rendering:crispEdges] inset-0 absolute -z-1`}
				data-puddle-static-profile={name}
				aria-hidden="true"
			>
				<defs>
					<path id={staticShapeId(name)} d={staticSnapshot.path}></path>
				</defs>
				<use
					href={`#${staticShapeId(name)}`}
					style:transform={staticTransform}
					style:transform-box="view-box"
					class="fill-[var(--puddle-color,#141414)]"
					data-puddle-static-visible
				></use>
			</svg>
		{/each}
	{/if}
	{@render children?.()}
	{#if clippedChildren}
		<div
			class="puddle-clipped pointer-events-none [clip-path:var(--puddle-clip)] inset-0 absolute"
			style:clip-path="var(--puddle-clip)"
			data-puddle-clipped-content
		>
			{@render clippedChildren()}
		</div>
	{/if}
</div>

<style>
	.responsive-puddle {
		--puddle-clip: var(--puddle-clip-compact);
	}

	.puddle-static {
		display: none;
	}

	.responsive-puddle:not([data-puddle-live]) .puddle-live,
	.responsive-puddle[data-puddle-live] .puddle-static {
		display: none;
	}

	.responsive-puddle:not([data-puddle-live]) .puddle-static-compact {
		display: block;
	}

	@media (min-width: 48rem) {
		.responsive-puddle {
			--puddle-clip: var(--puddle-clip-medium);
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-compact {
			display: none;
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-medium {
			display: block;
		}
	}

	@media (min-width: 64rem) {
		.responsive-puddle {
			--puddle-clip: var(--puddle-clip-expanded);
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-medium {
			display: none;
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-expanded {
			display: block;
		}
	}

	@media (min-width: 96rem) {
		.responsive-puddle {
			--puddle-clip: var(--puddle-clip-large);
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-expanded {
			display: none;
		}

		.responsive-puddle:not([data-puddle-live]) .puddle-static-large {
			display: block;
		}
	}
</style>
