export type DeviceGravityPermission = 'granted' | 'denied' | 'unsupported';

export interface DeviceMotionReading {
	readonly accelerationIncludingGravity: {
		readonly x: number | null;
		readonly y: number | null;
		readonly z: number | null;
	} | null;
	readonly rotationRate: {
		readonly alpha: number | null;
		readonly beta: number | null;
		readonly gamma: number | null;
	} | null;
	readonly interval: number;
}

export interface DeviceGravityTilt {
	readonly x: number;
	readonly y: number;
}

export interface DeviceGravityEstimator {
	readonly update: (
		reading: DeviceMotionReading,
		nowMs: number,
		neutralWindowSeconds?: number,
	) => void;
	readonly tilt: (
		nowMs: number,
		screenAngle: number,
		strength: number,
		neutralWindowSeconds?: number,
	) => DeviceGravityTilt | null;
	readonly reset: () => void;
}

interface Vector3 {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

interface TimedVector {
	readonly at: number;
	readonly vector: Vector3;
}

type MotionEventConstructor = typeof DeviceMotionEvent & {
	requestPermission?: () => Promise<PermissionState>;
};

const ACCEL_CORRECTION_TAU = 0.25;
const MIN_GRAVITY_MAGNITUDE = 2;
const MAX_GRAVITY_MAGNITUDE = 20;
const MAX_GYRO_RATE = 720;
const MAX_SENSOR_DT = 0.1;
const STALE_AFTER_MS = 500;
const DEGREES_TO_RADIANS = Math.PI / 180;

const finite = (value: number | null | undefined): value is number =>
	value !== null && value !== undefined && Number.isFinite(value);

function normalize(vector: Vector3): Vector3 | null {
	const length = Math.hypot(vector.x, vector.y, vector.z);
	if (!Number.isFinite(length) || length === 0) return null;
	return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function accelerationVector(reading: DeviceMotionReading): Vector3 | null {
	const acceleration = reading.accelerationIncludingGravity;
	if (
		!acceleration ||
		!finite(acceleration.x) ||
		!finite(acceleration.y) ||
		!finite(acceleration.z)
	)
		return null;
	const magnitude = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
	if (magnitude < MIN_GRAVITY_MAGNITUDE || magnitude > MAX_GRAVITY_MAGNITUDE) return null;
	return normalize({ x: acceleration.x, y: acceleration.y, z: acceleration.z });
}

function gyroVector(reading: DeviceMotionReading): Vector3 | null {
	const rate = reading.rotationRate;
	if (!rate) return null;
	const values = [rate.alpha, rate.beta, rate.gamma];
	if (!values.some(finite)) return null;
	const radians = values.map((value) =>
		finite(value)
			? Math.max(-MAX_GYRO_RATE, Math.min(MAX_GYRO_RATE, value)) * DEGREES_TO_RADIANS
			: 0,
	);
	return { x: radians[0] ?? 0, y: radians[1] ?? 0, z: radians[2] ?? 0 };
}

// A fixed world vector appears to rotate opposite the device's angular velocity.
function predictFromGyro(vector: Vector3, angularVelocity: Vector3, dt: number): Vector3 {
	const crossX = angularVelocity.y * vector.z - angularVelocity.z * vector.y;
	const crossY = angularVelocity.z * vector.x - angularVelocity.x * vector.z;
	const crossZ = angularVelocity.x * vector.y - angularVelocity.y * vector.x;
	return (
		normalize({
			x: vector.x - crossX * dt,
			y: vector.y - crossY * dt,
			z: vector.z - crossZ * dt,
		}) ?? vector
	);
}

function blend(from: Vector3, to: Vector3, amount: number): Vector3 {
	return (
		normalize({
			x: from.x + (to.x - from.x) * amount,
			y: from.y + (to.y - from.y) * amount,
			z: from.z + (to.z - from.z) * amount,
		}) ?? to
	);
}

const neutralWindowMs = (seconds: number): number =>
	Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;

export function projectDeviceGravity(
	vector: Vector3,
	screenAngle: number,
	strength: number,
): DeviceGravityTilt {
	const magnitude = Number.isFinite(strength) ? Math.max(0, strength) : 0;
	const angle = Number.isFinite(screenAngle) ? screenAngle * DEGREES_TO_RADIANS : 0;
	const naturalX = vector.x * magnitude;
	const naturalY = -vector.y * magnitude;
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	return {
		x: cosine * naturalX + sine * naturalY,
		y: -sine * naturalX + cosine * naturalY,
	};
}

export function createDeviceGravityEstimator(): DeviceGravityEstimator {
	let gravity: Vector3 | null = null;
	let previousReadingAt: number | null = null;
	let lastUsefulReadingAt: number | null = null;
	let gravityHistory: TimedVector[] = [];
	let historyStart = 0;

	const clearHistory = (): void => {
		gravityHistory = [];
		historyStart = 0;
	};

	const pruneHistory = (cutoff: number): void => {
		while (
			historyStart + 1 < gravityHistory.length &&
			(gravityHistory[historyStart + 1]?.at ?? Infinity) <= cutoff
		)
			historyStart++;
		if (historyStart > 256 && historyStart * 2 > gravityHistory.length) {
			gravityHistory = gravityHistory.slice(historyStart);
			historyStart = 0;
		}
	};

	const recordGravity = (nowMs: number, windowMs: number): void => {
		if (!gravity || windowMs === 0) {
			clearHistory();
			return;
		}
		const last = gravityHistory.at(-1);
		if (last?.at === nowMs)
			gravityHistory[gravityHistory.length - 1] = { at: nowMs, vector: gravity };
		else gravityHistory.push({ at: nowMs, vector: gravity });
		pruneHistory(nowMs - windowMs);
	};

	const rollingNeutral = (nowMs: number, windowMs: number): Vector3 | null => {
		const first = gravityHistory[historyStart];
		const latest = gravityHistory.at(-1);
		if (!first || !latest || windowMs === 0) return null;

		const windowStart = Math.max(nowMs - windowMs, first.at);
		let x = 0;
		let y = 0;
		let z = 0;
		let duration = 0;
		for (let i = historyStart; i < gravityHistory.length; i++) {
			const sample = gravityHistory[i];
			if (!sample) continue;
			const segmentStart = Math.max(windowStart, sample.at);
			const segmentEnd = Math.min(nowMs, gravityHistory[i + 1]?.at ?? nowMs);
			const segmentDuration = Math.max(0, segmentEnd - segmentStart);
			x += sample.vector.x * segmentDuration;
			y += sample.vector.y * segmentDuration;
			z += sample.vector.z * segmentDuration;
			duration += segmentDuration;
		}
		return duration > 0 ? { x: x / duration, y: y / duration, z: z / duration } : latest.vector;
	};

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
			recordGravity(nowMs, neutralWindowMs(neutralWindowSeconds));
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
		const neutral = rollingNeutral(nowMs, neutralWindowMs(neutralWindowSeconds));
		if (!neutral) return current;
		const baseline = projectDeviceGravity(neutral, screenAngle, strength);
		return { x: current.x - baseline.x, y: current.y - baseline.y };
	};

	const reset = (): void => {
		gravity = null;
		previousReadingAt = null;
		lastUsefulReadingAt = null;
		clearHistory();
	};

	return { update, tilt, reset };
}

/** Request motion access. Call from an intentional user gesture on browsers that prompt. */
export async function requestDeviceGravityPermission(): Promise<DeviceGravityPermission> {
	if (
		typeof window === 'undefined' ||
		!window.isSecureContext ||
		typeof window.DeviceMotionEvent !== 'function'
	)
		return 'unsupported';

	const motionEvent = window.DeviceMotionEvent as MotionEventConstructor;
	if (!motionEvent.requestPermission) return 'granted';
	try {
		return (await motionEvent.requestPermission()) === 'granted' ? 'granted' : 'denied';
	} catch {
		return 'denied';
	}
}
