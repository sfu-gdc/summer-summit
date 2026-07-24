export type Role = 'height' | 'flux' | 'scale' | 'terrain';

declare const roleBrand: unique symbol;
export interface Tex<RoleType extends Role> {
	readonly [roleBrand]: RoleType;
}

declare const secondsBrand: unique symbol;
export type Seconds = number & { readonly [secondsBrand]: 'Seconds' };
export type SubstepSeconds = number & { readonly [secondsBrand]: 'SubstepSeconds' };

declare const worldUnitsBrand: unique symbol;
declare const texelCoordinateBrand: unique symbol;
declare const texelDistanceBrand: unique symbol;
declare const domainCoordinateBrand: unique symbol;
export type WorldUnits = number & { readonly [worldUnitsBrand]: 'WorldUnits' };
export type TexelCoordinate = number & { readonly [texelCoordinateBrand]: 'TexelCoordinate' };
export type TexelDistance = number & { readonly [texelDistanceBrand]: 'TexelDistance' };
export type DomainCoordinate = number & { readonly [domainCoordinateBrand]: 'DomainCoordinate' };

export const seconds = (value: number): Seconds => value as Seconds;
export const substepSeconds = (value: number): SubstepSeconds => value as SubstepSeconds;
export const worldUnits = (value: number): WorldUnits => value as WorldUnits;
export const texelCoordinate = (value: number): TexelCoordinate => value as TexelCoordinate;
export const texelDistance = (value: number): TexelDistance => value as TexelDistance;
export const domainCoordinate = (value: number): DomainCoordinate => value as DomainCoordinate;

export function assertNever(value: never, context = 'value'): never {
	throw new Error(`Unexpected ${context}: ${JSON.stringify(value)}`);
}
