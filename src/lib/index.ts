// place files you want to import through the `$lib` alias in this folder.
export { default as Button } from './Button/Button.svelte';
export { default as ColorPalette } from './ColorPalette/ColorPalette.svelte';
export type { ColorPaletteProps } from './ColorPalette/ColorPalette.svelte';
export { default as ErodedCheckerboard } from './ErodedCheckerboard/ErodedCheckerboard.svelte';
export type { ErodedCheckerboardProps } from './ErodedCheckerboard/ErodedCheckerboard.svelte';
export {
	createColorPalette,
	interpolatorNames,
	standardColorStops,
	type ColorStop,
	type InterpolatorName,
	type OffsetInterpolation,
	type PaletteConfig,
	type PaletteSwatch,
} from './ColorPalette/palette';
export { default as Puddle } from './Puddle/Puddle.svelte';
export { requestDeviceGravityPermission, type DeviceGravityPermission } from './Puddle/device';
export { default as SprayBorder } from './SprayBorder/SprayBorder.svelte';
