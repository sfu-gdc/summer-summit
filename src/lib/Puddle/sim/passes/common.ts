export type FieldTransform = (value: number, index: number, column: number, row: number) => number;

export function writeField(field: Float32Array, width: number, transform: FieldTransform): void {
	for (let index = 0; index < field.length; index += 1) {
		field[index] = transform(field[index] ?? 0, index, index % width, Math.floor(index / width));
	}
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function sampleFace(
	field: Float32Array,
	width: number,
	height: number,
	positionX: number,
	positionY: number,
	offsetX: number,
	offsetY: number,
): number {
	const gridX = clamp(positionX - offsetX, 0, width - 1);
	const gridY = clamp(positionY - offsetY, 0, height - 1);
	const leftColumn = Math.floor(gridX);
	const bottomRow = Math.floor(gridY);
	const rightColumn = Math.min(width - 1, leftColumn + 1);
	const topRow = Math.min(height - 1, bottomRow + 1);
	const xWeight = gridX - leftColumn;
	const yWeight = gridY - bottomRow;
	const bottomLeft = field[bottomRow * width + leftColumn] ?? 0;
	const bottomRight = field[bottomRow * width + rightColumn] ?? 0;
	const topLeft = field[topRow * width + leftColumn] ?? 0;
	const topRight = field[topRow * width + rightColumn] ?? 0;
	return (
		(bottomLeft * (1 - xWeight) + bottomRight * xWeight) * (1 - yWeight) +
		(topLeft * (1 - xWeight) + topRight * xWeight) * yWeight
	);
}

export function smoothField(
	field: Float32Array,
	scratch: Float32Array,
	width: number,
	height: number,
	minColumn: number,
	maxColumn: number,
	minRow: number,
	maxRow: number,
	strength: number,
): void {
	scratch.set(field.subarray(0, width * height));
	writeField(field, width, (value, index, column, row) => {
		if (column < minColumn || column >= maxColumn || row < minRow || row >= maxRow) {
			return value;
		}

		const mean =
			((scratch[index - 1] ?? 0) +
				(scratch[index + 1] ?? 0) +
				(scratch[index - width] ?? 0) +
				(scratch[index + width] ?? 0)) *
			0.25;
		return (scratch[index] ?? 0) * (1 - strength) + mean * strength;
	});
}
