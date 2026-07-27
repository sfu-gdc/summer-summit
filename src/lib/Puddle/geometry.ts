import { PUDDLE_DEFAULTS } from './config';

export interface PuddleGeometryOptions {
	readonly cellSize: number;
	readonly maxCells: number;
}

export interface PuddleGeometry {
	readonly width: number;
	readonly height: number;
	readonly cols: number;
	readonly rows: number;
	readonly cellSize: number;
	readonly ready: boolean;
}

export function resolvePuddleGeometry(
	width: number,
	height: number,
	options: PuddleGeometryOptions,
): PuddleGeometry {
	const measuredWidth = Number.isFinite(width) && width > 0 ? width : 0;
	const measuredHeight = Number.isFinite(height) && height > 0 ? height : 0;
	const cellCap =
		Number.isFinite(options.maxCells) && options.maxCells >= 3
			? Math.floor(options.maxCells)
			: PUDDLE_DEFAULTS.maxCells;
	const configuredCell =
		Number.isFinite(options.cellSize) && options.cellSize >= 1
			? options.cellSize
			: PUDDLE_DEFAULTS.cellSize;
	const visibleCellCap = cellCap - 2;
	const cell = Math.max(
		configuredCell,
		measuredWidth / visibleCellCap,
		measuredHeight / visibleCellCap,
	);
	const cols = measuredWidth > 0 ? Math.min(cellCap, Math.ceil(measuredWidth / cell) + 2) : 0;
	const rows = measuredHeight > 0 ? Math.min(cellCap, Math.ceil(measuredHeight / cell) + 2) : 0;

	return {
		width: measuredWidth,
		height: measuredHeight,
		cols,
		rows,
		cellSize: cell,
		ready: cols > 0 && rows > 0,
	};
}
