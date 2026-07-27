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

function post(message: PuddleWorkerOutput): void {
	self.postMessage(message);
}

function cancelLoop(): void {
	if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
	frameHandle = 0;
	lastTime = 0;
}

function scheduleLoop(): void {
	if (!active || !initialized?.animated || !state || frameHandle !== 0) return;
	frameHandle = requestAnimationFrame(loop);
}

function loop(time: number): void {
	frameHandle = 0;
	if (!active || !initialized?.animated || !state) return;
	const dt = lastTime > 0 ? Math.min(0.1, (time - lastTime) / 1000) : 0;
	lastTime = time;
	const cursorEase =
		Number.isFinite(initialized.cursorEase) && initialized.cursorEase > 0
			? initialized.cursorEase
			: 0.05;
	const blend = 1 - Math.exp(-dt / cursorEase);
	smoothedPointer.x += ((pointer?.x ?? 0) - smoothedPointer.x) * blend;
	smoothedPointer.y += ((pointer?.y ?? 0) - smoothedPointer.y) * blend;
	const deviceEase =
		Number.isFinite(initialized.deviceEase) && initialized.deviceEase > 0
			? initialized.deviceEase
			: 0.05;
	const deviceBlend = 1 - Math.exp(-dt / deviceEase);
	smoothedDevice.x += (deviceTilt.x - smoothedDevice.x) * deviceBlend;
	smoothedDevice.y += (deviceTilt.y - smoothedDevice.y) * deviceBlend;
	state.sim.setTiltOffset(
		-initialized.cursorTilt * smoothedPointer.x + smoothedDevice.x,
		-initialized.cursorTilt * smoothedPointer.y + smoothedDevice.y,
	);
	const stats = state.sim.advance(dt);
	state.sim.clampMass(state.massCap, stats);
	if (!awaitingFrameConsumption) {
		const path = state.path();
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
