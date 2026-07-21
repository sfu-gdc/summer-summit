<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { type Color, formatCss, rgb } from 'culori';
	import { ElementSize } from 'runed';

	import { browser } from '$app/environment';

	import { createDeviceGravityEstimator } from './deviceGravity';
	import { createPuddleRenderer } from './puddleRenderer';
	import { createWaterSim, PUDDLE_DEFAULTS, type IntegratorId } from './waterSim';

	// Omit the deprecated HTML `color` attribute; intersecting with it would
	// collapse the prop type to `string` and reject culori Color objects.
	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'color'> & {
		/** Puddle fill color. Any CSS color string or culori Color. */
		color?: string | Color;
		/** Display size of one grid cell, in CSS px. Bigger = chunkier blocks. */
		cellSize?: number;
		/** Depth above which a cell is painted. */
		threshold?: number;
		/** Resting water level; higher fills more of the bowl (bigger puddle). */
		level?: number;
		/** Terrain seed; changes the organic edge shape. */
		seed?: number;
		/** Low-frequency edge roughness. */
		noiseAmp?: number;
		/** Ripple with raindrops instead of holding the settled shape. Ignored under prefers-reduced-motion. */
		animated?: boolean;
		/** Gently tilt gravity toward the pointer so the water leans after the cursor. Needs `animated`; ignored under prefers-reduced-motion. */
		followCursor?: boolean;
		/** Simulation pipeline: pipe core, or the momentum second implementation. */
		integrator?: IntegratorId;
		/** Momentum-only: grid-scale oscillation damping (0 = off, 1 = full). Applies to `integrator="pipes+momentum"`. */
		momentumSmoothing?: number;
		/** Momentum-only: how much carried momentum survives each substep (1 = lossless, lower = calmer). Applies to `integrator="pipes+momentum"`. */
		momentumRetention?: number;
		/** Animation speed: sim-seconds advanced per real-second. Needs `animated`. */
		timeScale?: number;
		/** Target physics substep size (sim-seconds); smaller = more accurate, costlier. */
		baseSubstep?: number;
		/** Per-frame substep ceiling (spiral-of-death guard). Needs `animated`. */
		maxSubsteps?: number;
		/** Gravity-wave CFL safety margin (0–1); higher is faster but risks instability. */
		cflSafety?: number;
		/** Depth floor in the CFL estimate. */
		minWaveDepth?: number;
		/** Sub-steps run to settle poured water before the first paint. */
		settleSubsteps?: number;
		/** Drift the puddle's lean with noise so it gently sloshes direction. Needs `animated`. */
		gravityDrift?: boolean;
		/** Noise-drift magnitude (only with `gravityDrift`). */
		driftAmp?: number;
		/** Noise-drift rate in Hz (only with `gravityDrift`). */
		driftRateHz?: number;
		/** Raindrop cadence in sim-seconds (only when `animated`). */
		rainInterval?: number;
		/** Depth each raindrop adds (only when `animated`). */
		rainAmount?: number;
		/** Raindrop radius in cells (only when `animated`). */
		rainRadius?: number;
		/** Resolution guardrail: max grid cells per axis. */
		maxCells?: number;
		/** Cursor-follow tilt strength (only with `followCursor`). */
		cursorTilt?: number;
		/** Cursor-follow easing time-constant in seconds (only with `followCursor`). */
		cursorEase?: number;
		/** Lean with device motion sensors after permission is requested. Needs `animated`; ignored under prefers-reduced-motion. */
		deviceGravity?: boolean;
		/** Maximum device-driven in-plane gravity. */
		deviceTilt?: number;
		/** Device-gravity easing time-constant in seconds. */
		deviceEase?: number;
		/** Trailing window averaged as the neutral device orientation, in seconds. Zero disables neutralization. */
		deviceNeutralWindow?: number;
		children?: Snippet;
	};

	const {
		color = '#141414',
		cellSize = PUDDLE_DEFAULTS.cellSize,
		threshold = PUDDLE_DEFAULTS.threshold,
		level = PUDDLE_DEFAULTS.level,
		seed = 7,
		noiseAmp = 0.4,
		animated = false,
		followCursor = false,
		integrator = PUDDLE_DEFAULTS.integrator,
		momentumSmoothing = PUDDLE_DEFAULTS.momentumSmoothing,
		momentumRetention = PUDDLE_DEFAULTS.momentumRetention,
		timeScale = 6,
		baseSubstep = 0.08,
		maxSubsteps = 8,
		cflSafety = 0.9,
		minWaveDepth = 0.001,
		settleSubsteps = 90,
		gravityDrift = PUDDLE_DEFAULTS.gravityDrift,
		driftAmp = PUDDLE_DEFAULTS.driftAmp,
		driftRateHz = 0.05,
		rainInterval = 0.6,
		rainAmount = 0.06,
		rainRadius = 1.5,
		maxCells = 200,
		cursorTilt = PUDDLE_DEFAULTS.cursorTilt,
		cursorEase = PUDDLE_DEFAULTS.cursorEase,
		deviceGravity = false,
		deviceTilt = 6,
		deviceEase = 0.18,
		deviceNeutralWindow = 2,
		class: className,
		children,
		...rest
	}: Props = $props();

	// Sanitize the color once via rgb(), which converts Color objects as well as
	// CSS strings (parse() is string-only and would drop objects to the fallback).
	// Passing the converted object (never an unparseable input) to the renderer
	// means render() can't fail on a bad color and flip `painted` back to false,
	// which would re-show the fallback under stale pixels.
	const colorObj = $derived(rgb(color) ?? { mode: 'rgb' as const, r: 0.08, g: 0.08, b: 0.08 });
	// SSR'd onto the fallback so the no-JS backdrop keeps the puddle color.
	const cssColor = $derived(formatCss(colorObj));

	let canvas = $state<HTMLCanvasElement | null>(null);
	let host = $state<HTMLElement | null>(null);
	// svelte:element / dynamic sizing -> a ResizeObserver via runed's ElementSize.
	const hostSize = new ElementSize(() => host);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	// Per-instance renderer: owns its scratch canvas + reusable ImageData.
	const renderer = createPuddleRenderer();
	const deviceGravityEstimator = createDeviceGravityEstimator();
	const deviceNeutralSeconds = $derived(
		Number.isFinite(deviceNeutralWindow) && deviceNeutralWindow >= 0
			? Math.min(deviceNeutralWindow, 60)
			: 2,
	);

	// Stays false without JS, keeping the CSS fallback backdrop visible.
	let painted = $state(false);

	// Last pointer position in viewport coords. Deliberately not $state: only the
	// RAF loop reads it, so reactivity would just be pointless invalidations.
	let pointer: { x: number; y: number } | null = null;
	const onPointerMove = (e: PointerEvent) => {
		pointer = { x: e.clientX, y: e.clientY };
	};
	const clearPointer = () => {
		pointer = null; // ease back to level when the cursor leaves the page
	};
	const onDeviceMotion = (event: DeviceMotionEvent) => {
		deviceGravityEstimator.update(event, performance.now(), deviceNeutralSeconds);
	};
	const onVisibilityChange = () => {
		if (document.hidden) deviceGravityEstimator.reset();
	};
	// Older sensor-capable Safari lacks the Screen Orientation API.
	const screenAngle = () =>
		(screen as unknown as { orientation?: { angle?: number } }).orientation?.angle ?? 0;

	const dpr = $derived(devicePixelRatio.current ?? 1);
	// Clamp cell size and grid so a zero / non-finite / tiny cellSize can't divide
	// by zero or allocate an enormous grid and freeze the page.
	const cellCap = $derived(Number.isFinite(maxCells) && maxCells >= 1 ? Math.floor(maxCells) : 200);
	const cell = $derived(
		Number.isFinite(cellSize) && cellSize >= 1 ? cellSize : PUDDLE_DEFAULTS.cellSize,
	);
	const cols = $derived(
		hostSize.width > 0 ? Math.min(cellCap, Math.max(8, Math.round(hostSize.width / cell))) : 0,
	);
	const rows = $derived(
		hostSize.height > 0 ? Math.min(cellCap, Math.max(6, Math.round(hostSize.height / cell))) : 0,
	);

	// Build (cheap: terrain + init) whenever the grid or terrain inputs change.
	// Settling is deferred to an effect so this derived stays light. `rain` is
	// always installed but only fires inside advance() (the RAF loop), which is
	// gated by `animated` — so toggling `animated` starts/stops the loop without
	// rebuilding the sim and dropping in-progress ripples.
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

	// Bring poured water to rest once per rebuilt sim (not on every redraw).
	$effect(() => {
		sim?.settle(settleSubsteps);
	});

	$effect(() => {
		if (!browser || !canvas || !host || !sim || hostSize.width === 0 || hostSize.height === 0)
			return;
		const cv = canvas;
		const el = host;
		const s = sim;

		const draw = () => {
			painted = renderer.render(cv, {
				nx: s.nx,
				ny: s.ny,
				height: s.height,
				cssW: hostSize.width,
				cssH: hostSize.height,
				dpr,
				threshold,
				color: colorObj,
			});
		};

		draw();
		if (!animated || reducedMotion.current) return; // hold the settled shape

		// Read synchronously so a runtime toggle restarts the effect (loop
		// callbacks are untracked).
		const follow = followCursor;
		const tiltStrength = cursorTilt;
		const tiltTau = cursorEase;
		const followDevice = deviceGravity;
		const deviceStrength = Number.isFinite(deviceTilt) ? Math.max(0, deviceTilt) : 6;
		const deviceTau = Number.isFinite(deviceEase) && deviceEase > 0 ? deviceEase : 0.18;
		const neutralWindow = deviceNeutralSeconds;
		// Eased tilt state, in unit direction toward the cursor.
		let tiltX = 0;
		let tiltY = 0;
		let deviceX = 0;
		let deviceY = 0;
		const applyInteractiveTilt = (dt: number, now: number) => {
			let gx = 0;
			let gy = 0;
			if (follow && pointer) {
				const r = el.getBoundingClientRect();
				const dx = pointer.x - (r.left + r.width / 2);
				const dy = pointer.y - (r.top + r.height / 2);
				const len = Math.hypot(dx, dy);
				// full strength half a box away, proportionally less near the center
				const half = Math.max(r.width, r.height) / 2;
				const m = Math.min(1, len / Math.max(half, 1));
				if (len > 0) {
					gx = (dx / len) * m;
					gy = (dy / len) * m;
				}
			}
			const cursorK = 1 - Math.exp(-dt / tiltTau);
			tiltX += (gx - tiltX) * cursorK;
			tiltY += (gy - tiltY) * cursorK;

			const deviceTarget = followDevice
				? deviceGravityEstimator.tilt(now, screenAngle(), deviceStrength, neutralWindow)
				: null;
			const deviceK = 1 - Math.exp(-dt / deviceTau);
			deviceX += ((deviceTarget?.x ?? 0) - deviceX) * deviceK;
			deviceY += ((deviceTarget?.y ?? 0) - deviceY) * deviceK;
			// negative tilt drives flow toward +axis (flux pass: dt·(g·dEta − tilt)),
			// and grid +y is screen-down, matching clientY
			s.setTiltOffset(-tiltStrength * tiltX + deviceX, -tiltStrength * tiltY + deviceY);
		};

		const cap = s.totalMass(); // raindrops add mass; cap keeps the level steady
		let raf = 0;
		let running = false;
		let last = 0;
		const loop = (t: number) => {
			const dt = last > 0 ? (t - last) / 1000 : 0; // real elapsed seconds
			last = t;
			if (follow || followDevice) applyInteractiveTilt(dt, performance.now());
			s.advance(dt); // framerate-independent stepping
			s.clampMass(cap);
			draw();
			raf = requestAnimationFrame(loop);
		};
		const start = () => {
			if (running) return;
			running = true;
			last = 0;
			raf = requestAnimationFrame(loop);
		};
		const stop = () => {
			running = false;
			cancelAnimationFrame(raf);
			deviceGravityEstimator.reset();
		};

		// Don't burn CPU rippling a puddle that's scrolled out of view.
		const io = new IntersectionObserver(([entry]) => {
			if (entry?.isIntersecting) start();
			else stop();
		});
		io.observe(el);
		return () => {
			stop();
			io.disconnect();
			s.setTiltOffset(0, 0); // don't leave the water leaning after teardown
		};
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
