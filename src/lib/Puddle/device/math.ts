import type { DeviceMotionReading, DeviceMotionTilt, Vector2, Vector3 } from './types';

const MAX_GYRO_RATE = 720;
const RATE_DEAD_ZONE = 1.5;
const RATE_REFERENCE = 180;
const ACCELERATION_DEAD_ZONE = 30;
const ACCELERATION_REFERENCE = 900;
const ACCELERATION_WEIGHT = 0.85;
const VELOCITY_WEIGHT = 0.2;

const finite = (value: number | null | undefined): value is number =>
	value !== null && value !== undefined && Number.isFinite(value);

const clamp = (value: number, minimum: number, maximum: number): number =>
	Math.max(minimum, Math.min(maximum, value));

const applyDeadZone = (value: number, deadZone: number): number => {
	const magnitude = Math.abs(value);
	return magnitude <= deadZone ? 0 : Math.sign(value) * (magnitude - deadZone);
};

const normalizeResponse = (value: number, deadZone: number, reference: number): number =>
	clamp(applyDeadZone(value, deadZone) / reference, -1, 1);

export function rotationRateVector(reading: DeviceMotionReading): Vector3 | null {
	const rate = reading.rotationRate;
	if (!rate) return null;
	const values = [rate.alpha, rate.beta, rate.gamma];
	if (!values.some(finite)) return null;
	// The current W3C spec maps alpha/beta/gamma to device x/y/z.
	const sanitized = values.map((value) =>
		finite(value) ? clamp(value, -MAX_GYRO_RATE, MAX_GYRO_RATE) : 0,
	);
	return { x: sanitized[0] ?? 0, y: sanitized[1] ?? 0, z: sanitized[2] ?? 0 };
}

export function blendVector(from: Vector3, to: Vector3, amount: number): Vector3 {
	const t = clamp(amount, 0, 1);
	return {
		x: from.x + (to.x - from.x) * t,
		y: from.y + (to.y - from.y) * t,
		z: from.z + (to.z - from.z) * t,
	};
}

export function angularAcceleration(from: Vector3, to: Vector3, dt: number): Vector3 {
	const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 1;
	return {
		x: (to.x - from.x) / safeDt,
		y: (to.y - from.y) / safeDt,
		z: (to.z - from.z) / safeDt,
	};
}

export function sloshVector(rate: Vector3, acceleration: Vector3): Vector2 {
	const rateX = normalizeResponse(rate.x, RATE_DEAD_ZONE, RATE_REFERENCE);
	const rateY = normalizeResponse(rate.y, RATE_DEAD_ZONE, RATE_REFERENCE);
	const accelerationX = normalizeResponse(
		acceleration.x,
		ACCELERATION_DEAD_ZONE,
		ACCELERATION_REFERENCE,
	);
	const accelerationY = normalizeResponse(
		acceleration.y,
		ACCELERATION_DEAD_ZONE,
		ACCELERATION_REFERENCE,
	);
	const x = -accelerationY * ACCELERATION_WEIGHT - rateY * VELOCITY_WEIGHT;
	const y = accelerationX * ACCELERATION_WEIGHT + rateX * VELOCITY_WEIGHT;
	const magnitude = Math.hypot(x, y);
	if (magnitude <= 1) return { x, y };
	return { x: x / magnitude, y: y / magnitude };
}

export function projectDeviceMotion(
	vector: Vector2,
	screenAngle: number,
	strength: number,
): DeviceMotionTilt {
	const magnitude = Number.isFinite(strength) ? Math.max(0, strength) : 0;
	const angle = Number.isFinite(screenAngle) ? screenAngle * (Math.PI / 180) : 0;
	const vectorX = Number.isFinite(vector.x) ? vector.x : 0;
	const vectorY = Number.isFinite(vector.y) ? vector.y : 0;
	const vectorMagnitude = Math.hypot(vectorX, vectorY);
	const scale = vectorMagnitude > 1 ? magnitude / vectorMagnitude : magnitude;
	const naturalX = vectorX * scale;
	const naturalY = -vectorY * scale;
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	return {
		x: cosine * naturalX + sine * naturalY,
		y: -sine * naturalX + cosine * naturalY,
	};
}

/** Compatibility name for code written against the earlier gravity projection. */
export const projectDeviceGravity = projectDeviceMotion;
