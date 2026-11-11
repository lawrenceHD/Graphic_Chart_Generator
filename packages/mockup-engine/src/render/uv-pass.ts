import type { UvMesh } from '../geometry/uv-map.js';

// UV_PASS (ADR-034): draws the triangles of a computed surface into two RGBA8 targets at once (MRT) that
// hold exactly the baked uv-*.png / vv-*.png format, so the slot shader of render/psd.ts reads them with
// no change: u or v on 16 bits (high byte red, low byte green), coverage in blue; the facing goes in the
// alpha of v. Image row 0 is written to texture row 0, as an image uploaded without flipping.

export const UV_PASS_VERTEX = `#version 300 es
in vec2 position;
in vec3 surface;
uniform vec2 uSize;
out vec3 vAttribute;
void main() {
  vAttribute = surface;
  gl_Position = vec4(position / uSize * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const UV_PASS_FRAGMENT = `#version 300 es
precision highp float;
uniform float uEdge;
in vec3 vAttribute;
layout(location = 0) out vec4 outU;
layout(location = 1) out vec4 outV;
vec2 split(float value) {
  float q = floor(clamp(value, 0.0, 1.0) * 65535.0 + 0.5);
  float high = floor(q / 256.0);
  return vec2(high, q - high * 256.0) / 255.0;
}
void main() {
  float facing = vAttribute.z;
  if (facing <= 0.0) discard;
  float t = uEdge > 0.0 ? clamp(facing / uEdge, 0.0, 1.0) : 1.0;
  float coverage = t * t * (3.0 - 2.0 * t);
  outU = vec4(split(vAttribute.x), coverage, 1.0);
  outV = vec4(split(vAttribute.y), coverage, clamp(facing, 0.0, 1.0));
}
`;

export interface UvTextures {
  readonly u: WebGLTexture;
  readonly v: WebGLTexture;
}

type GL = WebGL2RenderingContext;

function compile(gl: GL): WebGLProgram {
  const made = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, UV_PASS_VERTEX],
    [gl.FRAGMENT_SHADER, UV_PASS_FRAGMENT],
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
  gl.bindAttribLocation(made, 1, 'surface');
  gl.linkProgram(made);
  if (gl.getProgramParameter(made, gl.LINK_STATUS) !== true)
    throw new Error(`program: ${gl.getProgramInfoLog(made) ?? ''}`);
  return made;
}

function target(gl: GL, width: number, height: number): WebGLTexture {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  // Data, not colour: never filtered across a 16-bit split.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// The map depends on the geometry only, not on the brand: drawn once per mesh and context.
const programs = new WeakMap<GL, WebGLProgram>();
const drawn = new WeakMap<GL, WeakMap<UvMesh, UvTextures>>();

/** The u and v maps of `mesh` at the scene size, drawn on the GPU (cached per context and mesh). */
export function uvPass(gl: GL, mesh: UvMesh, width: number, height: number): UvTextures {
  const known = drawn.get(gl)?.get(mesh);
  if (known !== undefined) return known;
  const program = programs.get(gl) ?? compile(gl);
  programs.set(gl, program);
  const textures: UvTextures = { u: target(gl, width, height), v: target(gl, width, height) };
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures.u, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, textures.v, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // A vertex array of its own: the full-screen quad of the caller stays bound to the default one.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffers = [mesh.positions, mesh.attributes].map((data, location) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, location === 0 ? 2 : 3, gl.FLOAT, false, 0, 0);
    return buffer;
  });
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, 'uSize'), width, height);
  gl.uniform1f(gl.getUniformLocation(program, 'uEdge'), mesh.edge);
  gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);

  gl.bindVertexArray(null);
  for (const buffer of buffers) gl.deleteBuffer(buffer);
  gl.deleteBuffer(indices);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);

  const forContext = drawn.get(gl) ?? new WeakMap<UvMesh, UvTextures>();
  forContext.set(mesh, textures);
  drawn.set(gl, forContext);
  return textures;
}
