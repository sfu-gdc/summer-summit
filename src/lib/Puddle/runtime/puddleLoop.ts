import type { DeviceGravityEstimator } from '../device';
import type { WaterSim } from '../waterSim';

export interface PointerPosition {
	readonly x: number;
	readonly y: number;
}

export interface PuddleLoopOptions {
	readonly host: HTMLElement;
	readonly sim: Pick<WaterSim, 'advance' | 'clampMass' | 'setTiltOffset' | 'totalMass'>;
	readonly deviceGravityEstimator: Pick<DeviceGravityEstimator, 'reset' | 'tilt'>;
	readonly draw: () => void;
	readonly getPointer: () => PointerPosition | null;
	readonly followCursor: boolean;
	readonly cursorTilt: number;
	readonly cursorEase: number;
	readonly deviceGravity: boolean;
	readonly deviceTilt: number;
	readonly deviceEase: number;
	readonly deviceNeutralWindow: number;
	readonly screenAngle: () => number;
}

/**
 * Runs the animated Puddle lifecycle independently from Svelte. Every option is
 * captured by the caller before this starts, so RAF callbacks never depend on
 * untracked component state.
 */
export function startPuddleLoop(options: PuddleLoopOptions): () => void {
	const {
		host,
		sim,
		deviceGravityEstimator,
		draw,
		getPointer,
		followCursor,
		cursorTilt,
		cursorEase,
		deviceGravity,
		deviceTilt,
		deviceEase,
		deviceNeutralWindow,
		screenAngle,
	} = options;
	const deviceStrength = Number.isFinite(deviceTilt) ? Math.max(0, deviceTilt) : 6;
	const deviceTau = Number.isFinite(deviceEase) && deviceEase > 0 ? deviceEase : 0.18;
	let tiltX = 0;
	let tiltY = 0;
	let deviceX = 0;
	let deviceY = 0;
	const applyInteractiveTilt = (dt: number, now: number): void => {
		let gx = 0;
		let gy = 0;
		const pointer = getPointer();
		if (followCursor && pointer) {
			const rect = host.getBoundingClientRect();
			const dx = pointer.x - (rect.left + rect.width / 2);
			const dy = pointer.y - (rect.top + rect.height / 2);
			const length = Math.hypot(dx, dy);
			// Full strength half a box away, proportionally less near the center.
			const half = Math.max(rect.width, rect.height) / 2;
			const magnitude = Math.min(1, length / Math.max(half, 1));
			if (length > 0) {
				gx = (dx / length) * magnitude;
				gy = (dy / length) * magnitude;
			}
		}
		const cursorK = 1 - Math.exp(-dt / cursorEase);
		tiltX += (gx - tiltX) * cursorK;
		tiltY += (gy - tiltY) * cursorK;

		const deviceTarget = deviceGravity
			? deviceGravityEstimator.tilt(now, screenAngle(), deviceStrength, deviceNeutralWindow)
			: null;
		const deviceK = 1 - Math.exp(-dt / deviceTau);
		deviceX += ((deviceTarget?.x ?? 0) - deviceX) * deviceK;
		deviceY += ((deviceTarget?.y ?? 0) - deviceY) * deviceK;
		// Negative tilt drives flow toward +axis, and grid +y is screen-down.
		sim.setTiltOffset(-cursorTilt * tiltX + deviceX, -cursorTilt * tiltY + deviceY);
	};

	const massCap = sim.totalMass();
	let raf = 0;
	let running = false;
	let last = 0;
	const loop = (time: number): void => {
		const dt = last > 0 ? (time - last) / 1000 : 0;
		last = time;
		if (followCursor || deviceGravity) applyInteractiveTilt(dt, performance.now());
		sim.advance(dt);
		sim.clampMass(massCap);
		draw();
		raf = requestAnimationFrame(loop);
	};
	const start = (): void => {
		if (running) return;
		running = true;
		last = 0;
		raf = requestAnimationFrame(loop);
	};
	const stop = (): void => {
		running = false;
		cancelAnimationFrame(raf);
		deviceGravityEstimator.reset();
	};

	const observer = new IntersectionObserver(([entry]) => {
		if (entry?.isIntersecting) start();
		else stop();
	});
	observer.observe(host);
	return () => {
		stop();
		observer.disconnect();
		sim.setTiltOffset(0, 0);
	};
}
