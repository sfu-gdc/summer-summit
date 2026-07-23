export { createDeviceGravityEstimator, createDeviceMotionEstimator } from './estimator';
export { projectDeviceGravity, projectDeviceMotion } from './math';
export { requestDeviceGravityPermission } from './permission';
export { getScreenAngle } from './screen';
export type {
	DeviceGravityEstimator,
	DeviceGravityPermission,
	DeviceGravityTilt,
	DeviceMotionEstimator,
	DeviceMotionReading,
	DeviceMotionTilt,
} from './types';
