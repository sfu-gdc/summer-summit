import { MediaQuery } from 'svelte/reactivity';

import { ElementSize } from 'runed';

import { createDeviceMotionEstimator, getScreenAngle } from '../device';
import { resolvePuddleGeometry, type PuddleGeometryOptions } from '../geometry';
import { snapshotCompatibilityHash } from '../snapshot/compatibility';
import type { PuddleSnapshotAsset } from '../snapshot/types';
import type { PuddleWorkerInput, PuddleWorkerOutput } from '../worker/protocol';
import type { PuddleSimulationOptions } from './puddleSimulation';

export interface PuddleRuntimeOptions {
	readonly getInitialSnapshot: () => PuddleSnapshotAsset;
	readonly getSnapshotUrl: () => string;
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
}

export interface PuddleRuntime {
	host: HTMLElement | null;
	readonly painted: boolean;
	readonly live: boolean;
	readonly path: string;
	readonly centerTransform: string;
	readonly cols: number;
	readonly rows: number;
	readonly cellSize: number;
	readonly followCursor: boolean;
	readonly deviceGravity: boolean;
	readonly deviceMotionEnabled: boolean;
	readonly onPointerMove: (event: PointerEvent) => void;
	readonly clearPointer: () => void;
	readonly onDeviceMotion: (event: DeviceMotionEvent) => void;
	readonly onVisibilityChange: () => void;
}

export function createPuddleRuntime(options: PuddleRuntimeOptions): PuddleRuntime {
	let host = $state<HTMLElement | null>(null);
	const initialSnapshot = options.getInitialSnapshot();
	let activeSnapshot = initialSnapshot;
	let renderedCols = $state(initialSnapshot.nx);
	let renderedRows = $state(initialSnapshot.ny);
	let renderedCellSize = $state(initialSnapshot.cellSize);
	let renderedPath = $state(initialSnapshot.path);
	let live = $state(false);
	const hostSize = new ElementSize(() => host);
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const deviceMotionEstimator = createDeviceMotionEstimator();
	const geometry = $derived(
		resolvePuddleGeometry(hostSize.width, hostSize.height, options.getGeometryOptions()),
	);
	let worker: Worker | null = null;
	let visible = true;
	let pendingPath: string | null = null;
	let pendingDimensions: { cols: number; rows: number; cellSize: number } | null = null;
	let applyFrame = 0;
	let generation = 0;

	const post = (message: PuddleWorkerInput): void => worker?.postMessage(message);
	const updateActive = (): void => {
		post({ type: 'active', active: visible && !document.hidden });
	};
	const applyPendingPath = (): void => {
		applyFrame = 0;
		const path = pendingPath;
		if (path === null) return;
		renderedPath = path;
		pendingPath = null;
		if (pendingDimensions) {
			renderedCols = pendingDimensions.cols;
			renderedRows = pendingDimensions.rows;
			renderedCellSize = pendingDimensions.cellSize;
			pendingDimensions = null;
			live = true;
		}
		post({ type: 'frame-consumed' });
	};
	const queuePath = (
		path: string,
		dimensions?: { cols: number; rows: number; cellSize: number },
	): void => {
		pendingPath = path;
		if (dimensions) pendingDimensions = dimensions;
		if (applyFrame === 0) applyFrame = requestAnimationFrame(applyPendingPath);
	};

	const onPointerMove = (event: PointerEvent): void => {
		if (!host) return;
		const rect = host.getBoundingClientRect();
		const halfWidth = Math.max(rect.width / 2, 1);
		const halfHeight = Math.max(rect.height / 2, 1);
		post({
			type: 'pointer',
			x: Math.max(-1, Math.min(1, (event.clientX - rect.left - halfWidth) / halfWidth)),
			y: Math.max(-1, Math.min(1, (event.clientY - rect.top - halfHeight) / halfHeight)),
		});
	};
	const clearPointer = (): void => {
		post({ type: 'clear-pointer' });
	};
	const onDeviceMotion = (event: DeviceMotionEvent): void => {
		deviceMotionEstimator.update(event, performance.now());
		const tilt = deviceMotionEstimator.tilt(
			performance.now(),
			getScreenAngle(),
			options.getDeviceTilt(),
		);
		post({ type: 'device-tilt', x: tilt?.x ?? 0, y: tilt?.y ?? 0 });
	};
	const onVisibilityChange = (): void => {
		if (document.hidden) {
			deviceMotionEstimator.reset();
			post({ type: 'device-tilt', x: 0, y: 0 });
		}
		updateActive();
	};

	$effect(() => {
		if (!host || !geometry.ready) return;
		const target = host;
		const simulation = options.getSimulationOptions();
		const snapshot = options.getInitialSnapshot();
		const snapshotUrl = options.getSnapshotUrl();
		const settleSubsteps = options.getSettleSubsteps();
		const geometryOptions = options.getGeometryOptions();
		const depthThreshold = options.getThreshold();
		const animated = options.getAnimated() && !reducedMotion.current;
		const cursorTilt = options.getCursorTilt();
		const cursorEase = options.getCursorEase();
		const deviceEase = options.getDeviceEase();
		const currentGeneration = ++generation;
		if (snapshot !== activeSnapshot) {
			activeSnapshot = snapshot;
			renderedPath = snapshot.path;
			renderedCols = snapshot.nx;
			renderedRows = snapshot.ny;
			renderedCellSize = snapshot.cellSize;
			live = false;
		}
		// Vite statically extracts a worker only from this native URL expression.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const nextWorker = new Worker(new URL('../worker/puddle.worker.ts', import.meta.url), {
			type: 'module',
		});
		worker = nextWorker;
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? false;
			updateActive();
		});
		observer.observe(target);
		nextWorker.onmessage = (event: MessageEvent<PuddleWorkerOutput>): void => {
			const message = event.data;
			if (
				message.generation !== currentGeneration ||
				currentGeneration !== generation ||
				worker !== nextWorker
			) {
				return;
			}
			if (message.type === 'ready') {
				queuePath(message.path, {
					cols: message.nx,
					rows: message.ny,
					cellSize: message.cellSize,
				});
			} else if (message.type === 'path') {
				queuePath(message.path);
			}
		};
		nextWorker.postMessage({
			type: 'init',
			generation: currentGeneration,
			width: geometry.width,
			height: geometry.height,
			geometry: geometryOptions,
			simulation,
			settleSubsteps,
			threshold: depthThreshold,
			animated,
			snapshotUrl,
			compatibilityHash: snapshotCompatibilityHash({
				cellSize: geometryOptions.cellSize,
				settleSubsteps,
				simulation,
			}),
			cursorTilt,
			cursorEase,
			deviceEase,
		} satisfies PuddleWorkerInput);
		updateActive();
		return () => {
			observer.disconnect();
			nextWorker.terminate();
			if (worker === nextWorker) worker = null;
			if (applyFrame !== 0) cancelAnimationFrame(applyFrame);
			applyFrame = 0;
			pendingPath = null;
			pendingDimensions = null;
		};
	});

	return {
		get host() {
			return host;
		},
		set host(value) {
			host = value;
		},
		get painted() {
			return true;
		},
		get live() {
			return live;
		},
		get path() {
			return renderedPath;
		},
		get centerTransform() {
			return `translate(50%, 50%) translate(${((-renderedCols * renderedCellSize) / 2).toString()}px, ${((-renderedRows * renderedCellSize) / 2).toString()}px)`;
		},
		get cols() {
			return renderedCols;
		},
		get rows() {
			return renderedRows;
		},
		get cellSize() {
			return renderedCellSize;
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
