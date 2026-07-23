import type { ComponentProps } from 'svelte';

import type { Meta } from '@storybook/sveltekit';

import { brandColorValues } from '$lib/tokens';

import { PUDDLE_DEFAULTS } from '../config';
import type Puddle from '../Puddle.svelte';

type Args = ComponentProps<typeof Puddle>;
type PuddleMeta = Meta<typeof Puddle>;

const argTypes: NonNullable<PuddleMeta['argTypes']> = {
	cellSize: { control: { type: 'range', min: 12, max: 60, step: 1 } },
	threshold: { control: { type: 'range', min: 0, max: 0.3, step: 0.005 } },
	level: { control: { type: 'range', min: 0.3, max: 4, step: 0.02 } },
	seed: { control: { type: 'range', min: 1, max: 40, step: 1 } },
	noiseAmp: { control: { type: 'range', min: 0, max: 0.8, step: 0.02 } },
	animated: { control: 'boolean' },
	followCursor: { control: 'boolean' },
	integrator: { control: 'radio', options: ['pipes', 'pipes+momentum'] },
	momentumSmoothing: { control: { type: 'range', min: 0, max: 1, step: 0.02 } },
	momentumRetention: { control: { type: 'range', min: 0, max: 1, step: 0.02 } },
	timeScale: { control: { type: 'range', min: 0.5, max: 20, step: 0.5 } },
	baseSubstep: { control: { type: 'range', min: 0.02, max: 0.2, step: 0.005 } },
	maxSubsteps: { control: { type: 'range', min: 1, max: 16, step: 1 } },
	cflSafety: { control: { type: 'range', min: 0.3, max: 1, step: 0.02 } },
	minWaveDepth: { control: { type: 'range', min: 0.0001, max: 0.05, step: 0.0005 } },
	settleSubsteps: { control: { type: 'range', min: 0, max: 200, step: 10 } },
	gravityDrift: { control: 'boolean' },
	driftAmp: { control: { type: 'range', min: 0, max: 8, step: 0.05 } },
	driftRateHz: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
	rainInterval: { control: { type: 'range', min: 0.1, max: 3, step: 0.1 } },
	rainAmount: { control: { type: 'range', min: 0, max: 0.3, step: 0.01 } },
	rainRadius: { control: { type: 'range', min: 0.5, max: 5, step: 0.5 } },
	maxCells: { control: { type: 'range', min: 20, max: 200, step: 10 } },
	cursorTilt: { control: { type: 'range', min: 0, max: 8, step: 0.1 } },
	cursorEase: { control: { type: 'range', min: 0.05, max: 1.5, step: 0.05 } },
	deviceGravity: { control: 'boolean' },
	deviceTilt: { control: { type: 'range', min: 0, max: 12, step: 0.5 } },
	deviceEase: { control: { type: 'range', min: 0.05, max: 1.5, step: 0.05 } },
	deviceNeutralWindow: { control: { type: 'range', min: 0, max: 10, step: 0.25 } },
	color: { control: 'color' },
};

export const puddleStoryConfig = {
	args: {
		...PUDDLE_DEFAULTS,
		color: brandColorValues.shade['950'],
	} satisfies Args,
	argTypes,
	parameters: {
		backgrounds: { default: 'lime', values: [{ name: 'lime', value: '#c7f735' }] },
		controls: { include: Object.keys(argTypes) },
	},
} satisfies Pick<PuddleMeta, 'args' | 'argTypes' | 'parameters'>;
