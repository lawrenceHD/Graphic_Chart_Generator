import type { UvMesh } from '../geometry/uv-map.js';
import { PSD_LAYER_SHADER } from './psd.js';
import { VERTEX } from './shaders.js';
import { uvPass } from './uv-pass.js';

// WebGL2 runner of a baked PSD scene: layers drawn bottom to top into a ping-pong composite, then copied
// onto the canvas. Textures are uploaded without colour conversion so the UV maps keep their exact bytes.

export type PsdRenderLayer =
  | {
      readonly kind: 'image';
      readonly image: TexImageSource;
      readonly mode: number;
      readonly opacity: number;
    }
  | {
      readonly kind: 'paint';
      readonly mask: TexImageSource;
      readonly color: string;
      readonly opacity: number;
    }
  | {
      readonly kind: 'slot';
      readonly u: TexImageSource;
      readonly v: TexImageSource;
      readonly artwork: TexImageSource;
      readonly mode: number;
      readonly opacity: number;
    }
  | {
      /** A slot whose map is computed from its geometry (ADR-034), drawn on the GPU once per mesh. */
      readonly kind: 'mesh-slot';
      readonly mesh: UvMesh;
      readonly artwork: TexImageSource;
      readonly mode: number;
      readonly opacity: number;
    };

const COPY = `#version 300 es
precision highp float;
uniform sampler2D uSource;
out vec4 outColor;
void main() { outColor = vec4(texelFetch(uSource, ivec2(gl_FragCoord.xy), 0).rgb, 1.0); }
`;

type GL = WebGL2RenderingContext;

function program(gl: GL, fragment: string): WebGLProgram {
  const made = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) throw new Error('shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
      throw new Error(`shader: ${gl.getShaderInfoLog(shader) ?? ''}`);
    gl.attachShader(made, shader);
  }
  gl.bindAttribLocation(made, 0, 'position');
  gl.linkProgram(made);
  if (gl.getProgramParameter(made, gl.LINK_STATUS) !== true)
    throw new Error(`program: ${gl.getProgramInfoLog(made) ?? ''}`);
  return made;
}

function upload(
  gl: GL,
  source: TexImageSource | null,
  filter: 'linear' | 'nearest' | 'mipmap',
): WebGLTexture {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  if (source === null)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const mag = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    filter === 'mipmap' ? gl.LINEAR_MIPMAP_LINEAR : mag,
  );
  if (filter === 'mipmap' && source !== null) gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

const hexColor = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
];

/** Draws the layers on `canvas` (sized to the scene beforehand). Returns false without WebGL2. */
export function renderPsdScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  layers: readonly PsdRenderLayer[],
): boolean {
  const context = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (context === null || !(context instanceof WebGL2RenderingContext)) return false;
  const gl: GL = context;
  const { width, height } = canvas;
  const layerProgram = program(gl, PSD_LAYER_SHADER);
  const copyProgram = program(gl, COPY);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, width, height);

  const targets = [0, 1].map(() => {
    const tex = upload(gl, null, 'nearest');
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo };
  });
  const transient: WebGLTexture[] = [];
  const bind = (name: string, unit: number, tex: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(layerProgram, name), unit);
  };
  const at = (name: string) => gl.getUniformLocation(layerProgram, name);
  gl.useProgram(layerProgram);
  gl.uniform2f(at('uSize'), width, height);
  let current = 0;
  for (const layer of layers) {
    const source = targets[current];
    const target = targets[1 - current];
    if (source === undefined || target === undefined) break;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    const empty = upload(gl, null, 'nearest');
    transient.push(empty);
    if (layer.kind === 'image') {
      const tex = upload(gl, layer.image, 'linear');
      transient.push(tex);
      bind('uSource', 1, tex);
      bind('uU', 2, empty);
      bind('uV', 3, empty);
      gl.uniform1i(at('uKind'), 0);
      gl.uniform1i(at('uMode'), layer.mode);
    } else if (layer.kind === 'paint') {
      const tex = upload(gl, layer.mask, 'linear');
      transient.push(tex);
      bind('uSource', 1, tex);
      bind('uU', 2, empty);
      bind('uV', 3, empty);
      gl.uniform1i(at('uKind'), 1);
      gl.uniform1i(at('uMode'), 0);
      gl.uniform3fv(at('uColor'), hexColor(layer.color));
    } else if (layer.kind === 'mesh-slot') {
      const maps = uvPass(gl, layer.mesh, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, width, height);
      gl.useProgram(layerProgram);
      const art = upload(gl, layer.artwork, 'mipmap');
      transient.push(art);
      bind('uSource', 1, art);
      bind('uU', 2, maps.u);
      bind('uV', 3, maps.v);
      gl.uniform1i(at('uKind'), 2);
      gl.uniform1i(at('uMode'), layer.mode);
    } else {
      // UV maps are data: nearest sampling, never filtered across a 16-bit split.
      const u = upload(gl, layer.u, 'nearest');
      const v = upload(gl, layer.v, 'nearest');
      const art = upload(gl, layer.artwork, 'mipmap');
      transient.push(u, v, art);
      bind('uSource', 1, art);
      bind('uU', 2, u);
      bind('uV', 3, v);
      gl.uniform1i(at('uKind'), 2);
      gl.uniform1i(at('uMode'), layer.mode);
    }
    gl.uniform1f(at('uOpacity'), layer.opacity);
    // Bound last: uploading a texture binds it to the active unit and would replace the composite.
    bind('uPrev', 0, source.tex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    current = 1 - current;
  }
  gl.useProgram(copyProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, targets[current]?.tex ?? null);
  gl.uniform1i(gl.getUniformLocation(copyProgram, 'uSource'), 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  for (const tex of transient) gl.deleteTexture(tex);
  for (const { tex, fbo } of targets) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
  }
  return true;
}
