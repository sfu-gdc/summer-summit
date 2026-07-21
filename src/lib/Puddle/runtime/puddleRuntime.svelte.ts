import { MediaQuery } from 'svelte/reactivity';

import { ElementSize } from 'runed';

import { browser } from '$app/environment';

import { PUDDLE_DEFAULTS } from '../config';
import { createDeviceGravityEstimator, getScreenAngle } from '../device';
import { resolvePuddleGeometry, type PuddleGeometryOptions } from '../geometry';
import { createPuddleRenderer } from '../render/puddleRenderer';
import { startPuddleLoop } from './puddleLoop';
import { createPuddleSimulation, type PuddleSimulationOptions } from './puddleSimulation';

export interface PuddleRuntimeOptions {
	readonly getGeometryOptions: () => PuddleGeometryOptions;
	readonly getSimulationOptions: () => PuddleSimulationOptions;
	readonly getSettleSubsteps: () => number;
	readonly getThreshold: () => number;
	readonly getAnimated: () => boolean;
	readonly getFollowCursor: () => boolean;
	readonly getCursorTilt: () => number;
	readonly getCursorEase: () => number;
	readonly getDeviceGravity: () => boolean;
	readonly getDeviceTilt: () => number;
	readonly getDeviceEase: () => number;
	readonly getDeviceNeutralWindow: () => number;
}

export interface PuddleRuntime {
	host: HTMLElement | null;
	shape: SVGPathElement | null;
	readonly painted: boolean;
	readonly viewBox: string;
	readonly clipTransform: string;
	readonly followCursor: boolean;
	readonly deviceGravity: boolean;
	readonly deviceMotionEnabled: boolean;
	readonly onPointerMove: (event: PointerEvent) => void;
	readonly clearPointer: () => void;
	readonly onDeviceMotion: (event: DeviceMotionEvent) => void;
	readonly onVisibilityChange: () => void;
}

export function createPuddleRuntime(options: PuddleRuntimeOptions): PuddleRuntime {
	let shape = $state<SVGPathElement | null>(null);
	let host = $state<HTMLElement | null>(null);
	const hostSize = new ElementSize(() => host);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const renderer = createPuddleRenderer();
	const deviceGravityEstimator = createDeviceGravityEstimator();
	const deviceNeutralSeconds = $derived.by(() => {
		const value = options.getDeviceNeutralWindow();
		return Number.isFinite(value) && value >= 0
			? Math.min(value, 60)
			: PUDDLE_DEFAULTS.deviceNeutralWindow;
	});
	const geometry = $derived(
		resolvePuddleGeometry(hostSize.width, hostSize.height, options.getGeometryOptions()),
	);
	const sim = $derived.by(() => {
		if (!browser || !geometry.ready) return null;
		return createPuddleSimulation(geometry, options.getSimulationOptions());
	});

	// Stays false without JS, keeping the CSS fallback backdrop visible.
	let painted = $state(false);
	let pointer: { x: number; y: number } | null = null;

	const onPointerMove = (event: PointerEvent): void => {
		pointer = { x: event.clientX, y: event.clientY };
	};
	const clearPointer = (): void => {
		pointer = null;
	};
	const onDeviceMotion = (event: DeviceMotionEvent): void => {
		deviceGravityEstimator.update(event, performance.now(), deviceNeutralSeconds);
	};
	const onVisibilityChange = (): void => {
		if (document.hidden) deviceGravityEstimator.reset();
	};

	$effect(() => {
		sim?.settle(options.getSettleSubsteps());
	});

	$effect(() => {
		if (!shape || !host || !sim || hostSize.width === 0 || hostSize.height === 0) return;
		const target = shape;
		const element = host;
		const water = sim;
		const depthThreshold = options.getThreshold();
		const animated = options.getAnimated();
		const followCursor = options.getFollowCursor();
		const cursorTilt = options.getCursorTilt();
		const cursorEase = options.getCursorEase();
		const deviceGravity = options.getDeviceGravity();
		const deviceTilt = options.getDeviceTilt();
		const deviceEase = options.getDeviceEase();
		const neutralWindow = deviceNeutralSeconds;
		const draw = (): void => {
			painted = renderer.render(target, {
				nx: water.nx,
				ny: water.ny,
				height: water.height,
				threshold: depthThreshold,
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
			followCursor,
			cursorTilt,
			cursorEase,
			deviceGravity,
			deviceTilt,
			deviceEase,
			deviceNeutralWindow: neutralWindow,
			screenAngle: getScreenAngle,
		});
	});

	return {
		get host() {
			return host;
		},
		set host(value) {
			host = value;
		},
		get shape() {
			return shape;
		},
		set shape(value) {
			shape = value;
		},
		get painted() {
			return painted;
		},
		get viewBox() {
			return geometry.viewBox;
		},
		get clipTransform() {
			return geometry.clipTransform;
		},
		get followCursor() {
			return options.getFollowCursor();
		},
		get deviceGravity() {
			return options.getDeviceGravity();
		},
		get deviceMotionEnabled() {
			return options.getDeviceGravity() && options.getAnimated() && !reducedMotion.current;
		},
		onPointerMove,
		clearPointer,
		onDeviceMotion,
		onVisibilityChange,
	};
}
