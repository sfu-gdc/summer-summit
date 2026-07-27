import type { DeviceGravityPermission } from './types';

type MotionEventConstructor = typeof DeviceMotionEvent & {
	requestPermission?: () => Promise<PermissionState>;
};

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
