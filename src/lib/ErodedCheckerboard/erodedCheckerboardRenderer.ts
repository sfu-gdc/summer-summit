import * as twgl from 'twgl.js';

const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 position;

out vec2 textureCoordinate;

void main() {
	textureCoordinate = position * 0.5 + 0.5;
	gl_Position = vec4(position, 0.0, 1.0);
}`;

const PATTERN_FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

out vec4 fragmentColor;

uniform vec2 uLogicalResolution;
uniform vec2 uSourceScale;
uniform vec2 uFieldSize;
uniform float uCheckerSize;
uniform float uPixelSize;
uniform float uSeed;
uniform float uMaxErosion;
uniform float uFalloff;

float hash(vec2 point) {
	point = fract(point * vec2(123.34, 456.21));
	point += dot(point, point + 45.32 + uSeed);
	return fract(point.x * point.y);
}

float valueNoise(vec2 point) {
	vec2 cell = floor(point);
	vec2 offset = fract(point);
	offset = offset * offset * (3.0 - 2.0 * offset);

	float bottomLeft = hash(cell);
	float bottomRight = hash(cell + vec2(1.0, 0.0));
	float topLeft = hash(cell + vec2(0.0, 1.0));
	float topRight = hash(cell + vec2(1.0, 1.0));

	return mix(
		mix(bottomLeft, bottomRight, offset.x),
		mix(topLeft, topRight, offset.x),
		offset.y
	);
}

void main() {
	vec2 pixel = gl_FragCoord.xy / uSourceScale;
	vec2 checkerCoordinate = pixel / uCheckerSize;
	vec2 checkerCell = floor(checkerCoordinate);
	vec2 checkerPosition = fract(checkerCoordinate);

	vec2 fieldCenter = uLogicalResolution * 0.5;
	vec2 fieldPosition = (pixel - fieldCenter) / (uFieldSize * 0.5);
	float radialDistance = length(fieldPosition);
	float broadFieldNoise = valueNoise(
		checkerCell * 0.045 + vec2(31.7, -18.4)
	) - 0.5;
	float detailFieldNoise = valueNoise(
		checkerCell * 0.14 + vec2(-9.2, 47.1)
	) - 0.5;
	float signedErosion =
		uMaxErosion *
		(1.0 - pow(radialDistance / 1.14276, uFalloff)) +
		broadFieldNoise * 0.035 +
		detailFieldNoise * 0.012;
	float erosionAmount = abs(signedErosion);
	if (signedErosion > 0.28) {
		float excessErosion = signedErosion - 0.28;
		erosionAmount =
			0.28 +
			excessErosion * 0.426 +
			excessErosion * excessErosion * 0.345;
	} else if (signedErosion < -0.32) {
		float excessErosion = -signedErosion - 0.32;
		erosionAmount =
			0.32 +
			excessErosion * 0.4 +
			excessErosion * excessErosion * 0.2;
	}
	erosionAmount = max(
		erosionAmount +
			(hash(checkerCell + vec2(37.1, 89.7)) - 0.5) * 0.16,
		0.0
	);
	bool originalWhiteCell = mod(checkerCell.x + checkerCell.y, 2.0) < 1.0;
	bool affectedCell = originalWhiteCell != (signedErosion >= 0.0);

	float macroGridSize = max(round(uCheckerSize / uPixelSize), 2.0);
	vec2 macroPixel = min(
		floor(checkerPosition * macroGridSize),
		vec2(macroGridSize - 1.0)
	);
	float maxCornerDepth = floor((macroGridSize - 1.0) * 0.5) * 2.0;
	vec2 corner = step(vec2((macroGridSize - 1.0) * 0.5), macroPixel);
	vec2 cornerPixel = mix(
		macroPixel,
		vec2(macroGridSize - 1.0) - macroPixel,
		corner
	);
	float horizontalWeight = mix(
		0.82,
		1.18,
		hash(checkerCell * vec2(41.0, 17.0) + corner * vec2(131.0, 71.0) + 53.7)
	);
	vec2 cornerWeights = vec2(horizontalWeight, 2.0 - horizontalWeight);
	float frontierOrder = hash(
		checkerCell * vec2(23.0, 29.0) +
			corner * vec2(113.0, 197.0) +
			cornerPixel * vec2(7.1, 13.7) +
			97.3
	);
	float cornerDepth =
		dot(cornerPixel, cornerWeights) + frontierOrder * 0.7;
	float removalThreshold =
		(cornerDepth + 0.08) / (maxCornerDepth + 1.0);

	bool corePixel = erosionAmount < removalThreshold;

	bool whitePixel = originalWhiteCell;
	if (affectedCell) {
		whitePixel = originalWhiteCell ? corePixel : !corePixel;
	}

	float coverage = whitePixel ? 1.0 : 0.0;
	fragmentColor = vec4(coverage, coverage, coverage, 1.0);
}`;

const PRESENT_FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 textureCoordinate;
out vec4 fragmentColor;

uniform sampler2D uPattern;
uniform vec2 uPatternTexelSize;
uniform float uOpacity;

void main() {
	vec2 sampleOffset = uPatternTexelSize * 2.0;
	float coverage =
		texture(uPattern, textureCoordinate + vec2(-sampleOffset.x, -sampleOffset.y)).r +
		texture(uPattern, textureCoordinate + vec2(0.0, -sampleOffset.y)).r * 2.0 +
		texture(uPattern, textureCoordinate + vec2(sampleOffset.x, -sampleOffset.y)).r +
		texture(uPattern, textureCoordinate + vec2(-sampleOffset.x, 0.0)).r * 2.0 +
		texture(uPattern, textureCoordinate).r * 4.0 +
		texture(uPattern, textureCoordinate + vec2(sampleOffset.x, 0.0)).r * 2.0 +
		texture(uPattern, textureCoordinate + vec2(-sampleOffset.x, sampleOffset.y)).r +
		texture(uPattern, textureCoordinate + vec2(0.0, sampleOffset.y)).r * 2.0 +
		texture(uPattern, textureCoordinate + sampleOffset).r;
	coverage /= 16.0;
	coverage = round(coverage * 8.0) / 8.0;
	fragmentColor = vec4(vec3(coverage), uOpacity);
}`;

export interface ErodedCheckerboardRenderOptions {
	width: number;
	height: number;
	devicePixelRatio: number;
	maxFieldWidth?: number | undefined;
	maxFieldHeight?: number | undefined;
	checkerSize: number;
	pixelSize: number;
	seed: number;
	opacity: number;
	maxErosion: number;
	falloff: number;
}

export interface ErodedCheckerboardRenderer {
	render: (options: ErodedCheckerboardRenderOptions) => void;
	destroy: () => void;
}

export function createErodedCheckerboardRenderer(
	canvas: HTMLCanvasElement,
): ErodedCheckerboardRenderer | undefined {
	const gl = canvas.getContext('webgl2', {
		alpha: true,
		antialias: false,
		depth: false,
		powerPreference: 'low-power',
		premultipliedAlpha: false,
		preserveDrawingBuffer: true,
		stencil: false,
	});
	if (!gl) return;

	const patternProgramInfo = twgl.createProgramInfo(gl, [VERTEX_SHADER, PATTERN_FRAGMENT_SHADER]);
	const presentProgramInfo = twgl.createProgramInfo(gl, [VERTEX_SHADER, PRESENT_FRAGMENT_SHADER]);
	const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
		position: {
			numComponents: 2,
			data: [-1, -1, 3, -1, -1, 3],
		},
	});
	const framebufferAttachments: twgl.AttachmentOptions[] = [
		{
			format: gl.RGBA,
			internalFormat: gl.RGBA8,
			type: gl.UNSIGNED_BYTE,
			min: gl.LINEAR,
			mag: gl.LINEAR,
			wrap: gl.CLAMP_TO_EDGE,
		},
	];
	const patternFramebuffer = twgl.createFramebufferInfo(gl, framebufferAttachments, 1, 1);
	const patternTexture = patternFramebuffer.attachments[0] as WebGLTexture;
	const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

	return {
		render(options) {
			const outputScale = Math.max(options.devicePixelRatio, 1);
			const resolutionWidth = Math.max(1, Math.round(options.width * outputScale));
			const resolutionHeight = Math.max(1, Math.round(options.height * outputScale));
			const desiredSourceScale = outputScale * 2;
			const sourceScale = Math.max(
				1,
				Math.min(
					desiredSourceScale,
					maxTextureSize / Math.max(options.width, 1),
					maxTextureSize / Math.max(options.height, 1),
				),
			);
			const sourceWidth = Math.max(1, Math.round(options.width * sourceScale));
			const sourceHeight = Math.max(1, Math.round(options.height * sourceScale));
			const fieldWidth = Math.max(options.maxFieldWidth ?? options.width, 1);
			const fieldHeight = Math.max(options.maxFieldHeight ?? options.height, 1);

			if (canvas.width !== resolutionWidth || canvas.height !== resolutionHeight) {
				canvas.width = resolutionWidth;
				canvas.height = resolutionHeight;
			}
			if (patternFramebuffer.width !== sourceWidth || patternFramebuffer.height !== sourceHeight) {
				twgl.resizeFramebufferInfo(
					gl,
					patternFramebuffer,
					framebufferAttachments,
					sourceWidth,
					sourceHeight,
				);
			}

			twgl.bindFramebufferInfo(gl, patternFramebuffer);
			gl.disable(gl.BLEND);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.useProgram(patternProgramInfo.program);
			twgl.setBuffersAndAttributes(gl, patternProgramInfo, bufferInfo);
			twgl.setUniforms(patternProgramInfo, {
				uLogicalResolution: [options.width, options.height],
				uSourceScale: [
					sourceWidth / Math.max(options.width, 1),
					sourceHeight / Math.max(options.height, 1),
				],
				uFieldSize: [fieldWidth, fieldHeight],
				uCheckerSize: Math.max(options.checkerSize, 1),
				uPixelSize: Math.max(Math.min(options.pixelSize, options.checkerSize), 0.25),
				uSeed: options.seed,
				uMaxErosion: Math.min(Math.max(options.maxErosion, 0), 1),
				uFalloff: Math.max(options.falloff, 0.01),
			});
			twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLES);

			twgl.bindFramebufferInfo(gl, null);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.useProgram(presentProgramInfo.program);
			twgl.setBuffersAndAttributes(gl, presentProgramInfo, bufferInfo);
			twgl.setUniforms(presentProgramInfo, {
				uPattern: patternTexture,
				uPatternTexelSize: [1 / sourceWidth, 1 / sourceHeight],
				uOpacity: Math.min(Math.max(options.opacity, 0), 1),
			});
			twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLES);
		},
		destroy() {
			for (const attribute of Object.values(bufferInfo.attribs ?? {})) {
				gl.deleteBuffer(attribute.buffer);
			}
			gl.deleteTexture(patternTexture);
			gl.deleteFramebuffer(patternFramebuffer.framebuffer);
			gl.deleteProgram(patternProgramInfo.program);
			gl.deleteProgram(presentProgramInfo.program);
		},
	};
}
