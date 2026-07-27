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

function centeredCoordinate(position: number, extent: number): string {
	const offset = position - extent / 2;
	if (offset === 0) return '50%';
	const operator = offset > 0 ? '+' : '-';
	return `calc(50% ${operator} ${Math.abs(offset).toString()}px)`;
}

/** Build one rectangular subpath per horizontal run of wet cells. */
export function puddlePath(mask: ArrayLike<number>, nx: number, ny: number, cellSize = 1): string {
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
			path += `M${(start * cellSize).toString()} ${(y * cellSize).toString()}h${(
				width * cellSize
			).toString()}v${cellSize.toString()}h-${(width * cellSize).toString()}z`;
		}
	}
	return path;
}

/**
 * Build the same wet-cell runs as a reference-box-relative CSS shape.
 * CSS shape coordinates can mix percentages and pixels, unlike SVG URL clips on HTML elements.
 */
export function puddleClipShape(
	mask: ArrayLike<number>,
	nx: number,
	ny: number,
	cellSize = 1,
): string {
	const commands: string[] = [];
	const width = nx * cellSize;
	const height = ny * cellSize;
	for (let y = 0; y < ny; y++) {
		const row = y * nx;
		for (let x = 0; x < nx;) {
			if (mask[row + x] !== 1) {
				x++;
				continue;
			}

			const start = x;
			while (x < nx && mask[row + x] === 1) x++;
			const runWidth = (x - start) * cellSize;
			const position = `${centeredCoordinate(start * cellSize, width)} ${centeredCoordinate(y * cellSize, height)}`;
			commands.push(
				`${commands.length === 0 ? 'from' : 'move to'} ${position}`,
				`hline by ${runWidth.toString()}px`,
				`vline by ${cellSize.toString()}px`,
				`hline by -${runWidth.toString()}px`,
				'close',
			);
		}
	}
	return commands.length === 0 ? 'inset(50%)' : `shape(${commands.join(',')})`;
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
