export interface ScreenOrientationSource {
	readonly orientation?: {
		readonly angle?: number;
	};
}

export function getScreenAngle(source: ScreenOrientationSource = screen): number {
	return source.orientation?.angle ?? 0;
}
