export interface PuddleRenderParams {
	nx: number;
	ny: number;
	height: ArrayLike<number>;
	/** Depth above which a cell is painted. */
	threshold: number;
}

export interface PuddleRenderer {
	/** Update the thresholded puddle path. Returns false for invalid grid dimensions. */
	render: (target: SVGPathElement, params: PuddleRenderParams) => boolean;
}

/** Build one rectangular subpath per horizontal run of wet cells. */
export function puddlePath(mask: ArrayLike<number>, nx: number, ny: number): string {
	let path = '';
	for (let y = 0; y < ny; y++) {
		const row = y * nx;
		for (let x = 0; x < nx;) {
			if (mask[row + x] !== 1) {
				x++;
				continue;
			}

			const start = x;
			while (x < nx && mask[row + x] === 1) x++;
			const width = x - start;
			path += `M${start.toString()} ${y.toString()}h${width.toString()}v1h-${width.toString()}z`;
		}
	}
	return path;
}

export function createPuddleRenderer(): PuddleRenderer {
	let mask = new Uint8Array(0);
	let maskNx = 0;
	let maskNy = 0;
	let targetPath: SVGPathElement | null = null;

	const render = (target: SVGPathElement, params: PuddleRenderParams): boolean => {
		const { nx, ny, height, threshold } = params;
		if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx <= 0 || ny <= 0) return false;

		const dimensionsChanged = nx !== maskNx || ny !== maskNy;
		if (dimensionsChanged) {
			mask = new Uint8Array(nx * ny);
			maskNx = nx;
			maskNy = ny;
		}

		let maskChanged = dimensionsChanged;
		for (let k = 0; k < mask.length; k++) {
			const wet = (height[k] ?? 0) > threshold ? 1 : 0;
			if (mask[k] !== wet) {
				mask[k] = wet;
				maskChanged = true;
			}
		}

		if (maskChanged || targetPath !== target) target.setAttribute('d', puddlePath(mask, nx, ny));
		targetPath = target;
		return true;
	};

	return { render };
}
