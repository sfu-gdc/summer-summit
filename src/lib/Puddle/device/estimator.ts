import { createGravityHistory } from './history';
import {
	accelerationVector,
	blend,
	gyroVector,
	neutralWindowMs,
	predictFromGyro,
	projectDeviceGravity,
} from './math';
import type {
	DeviceGravityEstimator,
	DeviceGravityTilt,
	DeviceMotionReading,
	Vector3,
} from './types';

const ACCEL_CORRECTION_TAU = 0.25;
const MAX_SENSOR_DT = 0.1;
const STALE_AFTER_MS = 500;

export function createDeviceGravityEstimator(): DeviceGravityEstimator {
	let gravity: Vector3 | null = null;
	let previousReadingAt: number | null = null;
	let lastUsefulReadingAt: number | null = null;
	const history = createGravityHistory();

	const update = (reading: DeviceMotionReading, nowMs: number, neutralWindowSeconds = 0): void => {
		if (!Number.isFinite(nowMs)) return;
		const intervalSeconds = Number.isFinite(reading.interval) ? reading.interval / 1000 : 0;
		const elapsedSeconds =
			previousReadingAt === null
				? intervalSeconds
				: Math.max(0, (nowMs - previousReadingAt) / 1000);
		const dt = Math.min(MAX_SENSOR_DT, elapsedSeconds);
		previousReadingAt = nowMs;

		const angularVelocity = gyroVector(reading);
		if (gravity && angularVelocity && dt > 0)
			gravity = predictFromGyro(gravity, angularVelocity, dt);

		const measuredGravity = accelerationVector(reading);
		if (measuredGravity) {
			const correction = gravity ? 1 - Math.exp(-Math.max(dt, 1 / 120) / ACCEL_CORRECTION_TAU) : 1;
			gravity = gravity ? blend(gravity, measuredGravity, correction) : measuredGravity;
		}

		if (gravity && (measuredGravity || angularVelocity)) {
			lastUsefulReadingAt = nowMs;
			history.record(gravity, nowMs, neutralWindowMs(neutralWindowSeconds));
		}
	};

	const tilt = (
		nowMs: number,
		screenAngle: number,
		strength: number,
		neutralWindowSeconds = 0,
	): DeviceGravityTilt | null => {
		if (
			!gravity ||
			lastUsefulReadingAt === null ||
			!Number.isFinite(nowMs) ||
			nowMs - lastUsefulReadingAt > STALE_AFTER_MS
		)
			return null;
		const current = projectDeviceGravity(gravity, screenAngle, strength);
		const neutral = history.rollingNeutral(nowMs, neutralWindowMs(neutralWindowSeconds));
		if (!neutral) return current;
		const baseline = projectDeviceGravity(neutral, screenAngle, strength);
		return { x: current.x - baseline.x, y: current.y - baseline.y };
	};

	const reset = (): void => {
		gravity = null;
		previousReadingAt = null;
		lastUsefulReadingAt = null;
		history.clear();
	};

	return { update, tilt, reset };
}
