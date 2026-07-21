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

export interface Vector3 {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface TimedVector {
	readonly at: number;
	readonly vector: Vector3;
}
