import {
	angularAcceleration,
	blendVector,
	projectDeviceMotion,
	rotationRateVector,
	sloshVector,
} from './math';
import type {
	DeviceGravityEstimator,
	DeviceMotionEstimator,
	DeviceMotionTilt,
	DeviceMotionReading,
	Vector2,
	Vector3,
} from './types';

const RATE_FILTER_TAU = 0.04;
const DEFAULT_SENSOR_DT = 1 / 60;
const MIN_SENSOR_DT = 1 / 240;
const MAX_SENSOR_DT = 0.1;
const STALE_AFTER_MS = 500;
const STALE_FADE_TAU_MS = 180;

export function createDeviceMotionEstimator(): DeviceMotionEstimator {
	let filteredRate: Vector3 | null = null;
	let motion: Vector2 | null = null;
	let previousReadingAt: number | null = null;
	let lastUsefulReadingAt: number | null = null;

	const update = (reading: DeviceMotionReading, nowMs: number): void => {
		if (!Number.isFinite(nowMs)) return;
		const measuredRate = rotationRateVector(reading);
		if (!measuredRate) return;
		const intervalSeconds =
			Number.isFinite(reading.interval) && reading.interval > 0
				? reading.interval / 1000
				: DEFAULT_SENSOR_DT;
		const elapsedSeconds =
			previousReadingAt === null
				? intervalSeconds
				: Math.max(0, (nowMs - previousReadingAt) / 1000);
		const dt = Math.max(MIN_SENSOR_DT, Math.min(MAX_SENSOR_DT, elapsedSeconds));
		previousReadingAt = nowMs;

		if (!filteredRate) {
			filteredRate = measuredRate;
			motion = sloshVector(measuredRate, { x: 0, y: 0, z: 0 });
		} else {
			const previousRate = filteredRate;
			const filterAmount = 1 - Math.exp(-dt / RATE_FILTER_TAU);
			filteredRate = blendVector(previousRate, measuredRate, filterAmount);
			motion = sloshVector(filteredRate, angularAcceleration(previousRate, filteredRate, dt));
		}
		lastUsefulReadingAt = nowMs;
	};

	const tilt = (nowMs: number, screenAngle: number, strength: number): DeviceMotionTilt | null => {
		if (
			!motion ||
			lastUsefulReadingAt === null ||
			!Number.isFinite(nowMs) ||
			nowMs - lastUsefulReadingAt > STALE_AFTER_MS
		)
			return null;
		const age = Math.max(0, nowMs - lastUsefulReadingAt);
		const freshness = Math.exp(-age / STALE_FADE_TAU_MS);
		return projectDeviceMotion(
			{ x: motion.x * freshness, y: motion.y * freshness },
			screenAngle,
			strength,
		);
	};

	const reset = (): void => {
		filteredRate = null;
		motion = null;
		previousReadingAt = null;
		lastUsefulReadingAt = null;
	};

	return { update, tilt, reset };
}

/** Compatibility name for code written against the earlier gravity estimator. */
export const createDeviceGravityEstimator: () => DeviceGravityEstimator =
	createDeviceMotionEstimator;
