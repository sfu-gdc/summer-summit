import { initializePuddleWorkerState } from './core';
import type { PuddleWorkerInitMessage, PuddleWorkerInput, PuddleWorkerOutput } from './protocol';

type WorkerState = Awaited<ReturnType<typeof initializePuddleWorkerState>>;

let generation = 0;
let state: WorkerState | null = null;
let initialized: PuddleWorkerInitMessage | null = null;
let active = false;
let awaitingFrameConsumption = false;
let pointer: { x: number; y: number } | null = null;
let deviceTilt = { x: 0, y: 0 };
let smoothedPointer = { x: 0, y: 0 };
let smoothedDevice = { x: 0, y: 0 };
let lastTime = 0;
let frameHandle = 0;
let massCap = 0;
let transitionExpansion: {
	readonly requestId: number;
	readonly fromLevel: number;
	readonly toLevel: number;
	readonly durationMs: number;
	startedAt: number | null;
} | null = null;

function post(message: PuddleWorkerOutput): void {
	self.postMessage(message);
}

function cancelLoop(): void {
	if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
	frameHandle = 0;
	lastTime = 0;
}

function scheduleLoop(): void {
	if (!active || (!initialized?.animated && !transitionExpansion) || !state || frameHandle !== 0)
		return;
	frameHandle = requestAnimationFrame(loop);
}

function loop(time: number): void {
	frameHandle = 0;
	const currentInitialization = initialized;
	const currentState = state;
	if (
		!active ||
		!currentInitialization ||
		!currentState ||
		(!currentInitialization.animated && !transitionExpansion)
	) {
		return;
	}
	const expansion = transitionExpansion;
	if (expansion) {
		expansion.startedAt ??= time;
		const progress = Math.min(1, (time - expansion.startedAt) / expansion.durationMs);
		const easedProgress = 1 - (1 - progress) ** 3;
		currentState.sim.fill(
			expansion.fromLevel + (expansion.toLevel - expansion.fromLevel) * easedProgress,
		);
		// Transition fill is intentional mass, so the rain safety cap must retain it.
		massCap = currentState.sim.totalMass();
		if (progress >= 1) transitionExpansion = null;
	}
	const dt = lastTime > 0 ? Math.min(0.1, (time - lastTime) / 1000) : 0;
	lastTime = time;
	const cursorEase =
		Number.isFinite(currentInitialization.cursorEase) && currentInitialization.cursorEase > 0
			? currentInitialization.cursorEase
			: 0.05;
	const blend = 1 - Math.exp(-dt / cursorEase);
	smoothedPointer.x += ((pointer?.x ?? 0) - smoothedPointer.x) * blend;
	smoothedPointer.y += ((pointer?.y ?? 0) - smoothedPointer.y) * blend;
	const deviceEase =
		Number.isFinite(currentInitialization.deviceEase) && currentInitialization.deviceEase > 0
			? currentInitialization.deviceEase
			: 0.05;
	const deviceBlend = 1 - Math.exp(-dt / deviceEase);
	smoothedDevice.x += (deviceTilt.x - smoothedDevice.x) * deviceBlend;
	smoothedDevice.y += (deviceTilt.y - smoothedDevice.y) * deviceBlend;
	currentState.sim.setTiltOffset(
		-currentInitialization.cursorTilt * smoothedPointer.x + smoothedDevice.x,
		-currentInitialization.cursorTilt * smoothedPointer.y + smoothedDevice.y,
	);
	const stats = currentInitialization.animated ? currentState.sim.advance(dt) : undefined;
	currentState.sim.clampMass(massCap, stats);
	if (expansion && !transitionExpansion) {
		const path = currentState.path(true) ?? '';
		post({
			type: 'transition-expanded',
			generation,
			requestId: expansion.requestId,
			path,
		});
		awaitingFrameConsumption = true;
	}
	if (!awaitingFrameConsumption) {
		const path = currentState.path();
		if (path !== null) {
			post({ type: 'path', generation, path });
			awaitingFrameConsumption = true;
		}
	}
	scheduleLoop();
}

async function initialize(message: PuddleWorkerInitMessage): Promise<void> {
	cancelLoop();
	generation = message.generation;
	initialized = message;
	state = null;
	transitionExpansion = null;
	massCap = 0;
	awaitingFrameConsumption = false;
	pointer = null;
	smoothedPointer = { x: 0, y: 0 };
	smoothedDevice = { x: 0, y: 0 };
	try {
		const next = await initializePuddleWorkerState(message, async (url) => {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Snapshot request failed (${response.status.toString()})`);
			return response.arrayBuffer();
		});
		if (generation !== message.generation) return;
		state = next;
		massCap = next.massCap;
		const path = next.path();
		if (path === null) throw new Error('Puddle worker produced no initial path');
		post({
			type: 'ready',
			generation,
			nx: next.nx,
			ny: next.ny,
			cellSize: next.cellSize,
			path,
		});
		awaitingFrameConsumption = true;
		scheduleLoop();
	} catch (error) {
		post({
			type: 'error',
			generation,
			message: error instanceof Error ? error.message : 'Puddle worker failed',
		});
	}
}

self.onmessage = (event: MessageEvent<PuddleWorkerInput>): void => {
	const message = event.data;
	switch (message.type) {
		case 'init':
			void initialize(message);
			break;
		case 'active':
			active = message.active;
			if (active) scheduleLoop();
			else cancelLoop();
			break;
		case 'transition-expand':
			if (!state || !initialized || !Number.isFinite(message.level)) break;
			transitionExpansion = {
				requestId: message.requestId,
				fromLevel: initialized.simulation.level,
				toLevel: Math.max(initialized.simulation.level, message.level),
				durationMs:
					Number.isFinite(message.durationMs) && message.durationMs > 0 ? message.durationMs : 100,
				startedAt: null,
			};
			scheduleLoop();
			break;
		case 'pointer':
			pointer = { x: message.x, y: message.y };
			break;
		case 'clear-pointer':
			pointer = null;
			break;
		case 'device-tilt':
			deviceTilt = { x: message.x, y: message.y };
			break;
		case 'frame-consumed':
			awaitingFrameConsumption = false;
			break;
	}
};
