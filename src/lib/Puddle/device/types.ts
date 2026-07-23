export type DeviceGravityPermission = 'granted' | 'denied' | 'unsupported';

export interface DeviceMotionReading {
	readonly rotationRate: {
		readonly alpha: number | null;
		readonly beta: number | null;
		readonly gamma: number | null;
	} | null;
	readonly interval: number;
}

export interface DeviceMotionTilt {
	readonly x: number;
	readonly y: number;
}

export interface DeviceMotionEstimator {
	readonly update: (reading: DeviceMotionReading, nowMs: number) => void;
	readonly tilt: (nowMs: number, screenAngle: number, strength: number) => DeviceMotionTilt | null;
	readonly reset: () => void;
}

/** Compatibility name for code written against the earlier gravity estimator. */
export type DeviceGravityTilt = DeviceMotionTilt;

/** Compatibility name for code written against the earlier gravity estimator. */
export type DeviceGravityEstimator = DeviceMotionEstimator;

export interface Vector3 {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface Vector2 {
	readonly x: number;
	readonly y: number;
}
