import { texelCoordinate, texelDistance, worldUnits } from '../brands';
import { params as paramSchema } from '../params';
import type { FrameStats } from '../types';
import { createConfiguredEngine, createWaterSimConfig } from './config';
import { DEFAULT_SETTLE_SUBSTEPS } from './defaults';
import { type WaterSimOptions, nonnegativeIntegerOrZero } from './options';

const MAX_TILT = paramSchema.tiltX.max;

function clampTilt(value: number): number {
	return Math.max(-MAX_TILT, Math.min(MAX_TILT, value));
}

export class WaterSim {
	readonly nx: number;
	readonly ny: number;

	private readonly engine: ReturnType<typeof createConfiguredEngine>;
	private readonly heightSnapshot: Float32Array;
	private readonly tiltOffset = { x: 0, y: 0 };

	constructor(options: WaterSimOptions) {
		const config = createWaterSimConfig(options, this.tiltOffset);
		this.nx = config.grid.nx;
		this.ny = config.grid.ny;
		this.engine = createConfiguredEngine(config);

		// Hide the mutable, ping-pong engine buffer behind a reused snapshot.
		this.heightSnapshot = new Float32Array(this.nx * this.ny);
	}

	/**
	 * Current per-cell depth for rendering. This reused snapshot is overwritten on
	 * each access; copy it to retain a frame's values.
	 */
	get height(): Float32Array {
		this.heightSnapshot.set(this.engine.height());
		return this.heightSnapshot;
	}

	/** Run substeps to bring poured water to rest (deterministic). */
	settle(substeps = DEFAULT_SETTLE_SUBSTEPS): void {
		this.engine.settle(nonnegativeIntegerOrZero(substeps));
	}

	/** Advance by real elapsed seconds (framerate-independent). Returns this frame's stats. */
	advance(realDtSeconds: number): FrameStats {
		return this.engine.advance(realDtSeconds);
	}

	step(dt: number): void {
		if (Number.isFinite(dt)) this.engine.step(dt);
	}

	splat(x: number, y: number, amount: number, radius: number): void {
		if (![x, y, amount, radius].every(Number.isFinite)) return;
		this.engine.emit({
			kind: 'splat',
			x: texelCoordinate(x),
			y: texelCoordinate(y),
			amount: worldUnits(amount),
			radius: texelDistance(radius),
		});
	}

	/**
	 * In-plane gravity tilt added on top of the configured driver (pointer /
	 * device-orientation interaction). Same sign convention as the `tiltX`/`tiltY`
	 * params: a negative x offset drives flow toward +x. Clamped to the tilt range.
	 */
	setTiltOffset(x: number, y: number): void {
		if (![x, y].every(Number.isFinite)) return;
		this.tiltOffset.x = clampTilt(x);
		this.tiltOffset.y = clampTilt(y);
	}

	clampMass(target: number): void {
		if (Number.isFinite(target)) this.engine.clampMass(Math.max(0, target));
	}

	totalMass(): number {
		return this.engine.totalMass();
	}

	reset(): void {
		this.engine.reset();
	}
}

export function createWaterSim(options: WaterSimOptions): WaterSim {
	return new WaterSim(options);
}
