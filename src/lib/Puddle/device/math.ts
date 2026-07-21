import type { DeviceGravityTilt, DeviceMotionReading, Vector3 } from './types';

const MIN_GRAVITY_MAGNITUDE = 2;
const MAX_GRAVITY_MAGNITUDE = 20;
const MAX_GYRO_RATE = 720;
const DEGREES_TO_RADIANS = Math.PI / 180;

const finite = (value: number | null | undefined): value is number =>
	value !== null && value !== undefined && Number.isFinite(value);

export function normalize(vector: Vector3): Vector3 | null {
	const length = Math.hypot(vector.x, vector.y, vector.z);
	if (!Number.isFinite(length) || length === 0) return null;
	return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function accelerationVector(reading: DeviceMotionReading): Vector3 | null {
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

export function gyroVector(reading: DeviceMotionReading): Vector3 | null {
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

export function predictFromGyro(vector: Vector3, angularVelocity: Vector3, dt: number): Vector3 {
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

export function blend(from: Vector3, to: Vector3, amount: number): Vector3 {
	return (
		normalize({
			x: from.x + (to.x - from.x) * amount,
			y: from.y + (to.y - from.y) * amount,
			z: from.z + (to.z - from.z) * amount,
		}) ?? to
	);
}

export const neutralWindowMs = (seconds: number): number =>
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
