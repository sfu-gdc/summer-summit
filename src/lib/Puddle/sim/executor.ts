import type { Role, SubstepSeconds } from './brands';
import type { Params } from './params';
import { runKernel } from './passes';
import type { Resources } from './resources';
import type { GravitySample, Integrator, PassCtx, PassDesc, ScalarRole } from './types';

function bindPassContext(
	resources: Resources,
	passDescription: PassDesc,
	substepSeconds: SubstepSeconds,
	params: Params,
	gravity: GravitySample,
): PassCtx {
	const assertReadDeclared = (role: Role): void => {
		if (!passDescription.reads.includes(role)) {
			throw new Error(`pass ${passDescription.kind} does not declare a read of '${role}'`);
		}
	};
	return {
		grid: resources.grid,
		dt: substepSeconds,
		params,
		gravity,
		readScalar: (role: ScalarRole) => {
			assertReadDeclared(role);
			return resources.currentScalar(role);
		},
		readPrevScalar: (role: ScalarRole) => {
			// Previous-generation reads still require a declared dependency.
			assertReadDeclared(role);
			return resources.previousScalar(role);
		},
		readFlux: () => {
			assertReadDeclared('flux');
			return resources.currentFlux();
		},
		writeScalar: () => {
			if (passDescription.writes === 'flux') {
				throw new Error(`pass ${passDescription.kind} writes flux, not a scalar`);
			}
			return resources.targetScalar(passDescription.writes);
		},
		writeFlux: () => {
			if (passDescription.writes !== 'flux') {
				throw new Error(`pass ${passDescription.kind} does not write flux`);
			}
			return resources.targetFlux();
		},
	};
}

export function runSubstep(
	resources: Resources,
	integrator: Integrator,
	substepSeconds: SubstepSeconds,
	params: Params,
	gravity: GravitySample,
): void {
	for (const passDescription of integrator.passes) {
		runKernel(
			passDescription.kind,
			bindPassContext(resources, passDescription, substepSeconds, params, gravity),
		);
		resources.swap(passDescription.writes);
	}
}

export function runSubsteps(
	resources: Resources,
	integrator: Integrator,
	substepCount: number,
	substepSeconds: SubstepSeconds,
	params: Params,
	gravity: GravitySample,
): void {
	for (let substepIndex = 0; substepIndex < substepCount; substepIndex++) {
		runSubstep(resources, integrator, substepSeconds, params, gravity);
	}
}
