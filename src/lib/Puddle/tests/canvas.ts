export const nextFrame = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});

export function ctxOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('no 2d context');
	return ctx;
}

export function rgbaAt(canvas: HTMLCanvasElement, fx: number, fy: number): Uint8ClampedArray {
	const x = Math.floor(canvas.width * fx);
	const y = Math.floor(canvas.height * fy);
	return ctxOf(canvas).getImageData(x, y, 1, 1).data;
}

export function alphaAt(canvas: HTMLCanvasElement, fx: number, fy: number): number {
	return rgbaAt(canvas, fx, fy)[3] ?? 0;
}

export function paintedFraction(canvas: HTMLCanvasElement): number {
	const { data } = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height);
	let n = 0;
	for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++;
	return n / (canvas.width * canvas.height);
}

export function paintedHalves(canvas: HTMLCanvasElement): { left: number; right: number } {
	const { data } = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height);
	let left = 0;
	let right = 0;
	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) > 0) {
				if (x < canvas.width / 2) left++;
				else right++;
			}
		}
	}
	return { left, right };
}

export async function waitForPaintedFraction(
	canvas: HTMLCanvasElement,
	maxFrames: number,
): Promise<number> {
	let fraction = 0;
	for (let i = 0; i < maxFrames; i++) {
		if (canvas.width > 0) {
			fraction = paintedFraction(canvas);
			if (fraction > 0) break;
		}
		await nextFrame();
	}
	return fraction;
}
