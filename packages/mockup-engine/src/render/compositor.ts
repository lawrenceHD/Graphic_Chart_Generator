import { COPY, SURFACE, VERTEX } from './shaders.js';
import type { SurfaceUniforms } from './uniforms.js';

// WebGL2 runner of the compositor: the photograph is copied into a composite, each surface is one
// full-screen pass reading the previous composite (ping-pong), the last composite is drawn on the canvas.

export interface CompositorLayer {
  readonly uniforms: SurfaceUniforms;
  readonly mask: TexImageSource | null;
  /** The logo version for this surface, rasterised at the surface's size, straight alpha. */
  readonly logo: TexImageSource | null;
}

export interface Compositor {
  render(base: TexImageSource, layers: readonly CompositorLayer[]): void;
  dispose(): void;
}

type GL = WebGL2RenderingContext;

function compile(gl: GL, vertex: string, fragment: string): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      throw new Error(`shader: ${gl.getShaderInfoLog(shader) ?? 'compile failed'}`);
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'position');
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error(`program: ${gl.getProgramInfoLog(program) ?? 'link failed'}`);
  }
  return program;
}

function texture(gl: GL, source: TexImageSource | null, mipmaps: boolean): WebGLTexture {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (source === null)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
  );
  if (mipmaps && source !== null) gl.generateMipmap(gl.TEXTURE_2D);
  const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
  if (mipmaps && anisotropy !== null)
    gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return tex;
}

/** A compositor on `canvas`, or null where WebGL2 is unavailable (the caller shows the CSS fallback). */
export function createCompositor(canvas: HTMLCanvasElement | OffscreenCanvas): Compositor | null {
  const context = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (context === null || !(context instanceof WebGL2RenderingContext)) return null;
  const gl: GL = context;
  const copy = compile(gl, VERTEX, COPY);
  const surface = compile(gl, VERTEX, SURFACE);
  if (copy === null || surface === null) return null;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const bind = (program: WebGLProgram, name: string, unit: number, tex: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(program, name), unit);
  };

  return {
    render(base, layers) {
      const { width, height } = canvas;
      gl.viewport(0, 0, width, height);
      const photo = texture(gl, base, true);
      const targets = [0, 1].map(() => {
        const tex = texture(gl, null, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        return { tex, fbo };
      });
      const transient: WebGLTexture[] = [photo];
      let current = 0;

      gl.useProgram(copy);
      gl.uniform2f(gl.getUniformLocation(copy, 'uSize'), width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0]?.fbo ?? null);
      bind(copy, 'uSource', 0, photo);
      gl.uniform1i(gl.getUniformLocation(copy, 'uFromPhoto'), 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.useProgram(surface);
      const at = (name: string) => gl.getUniformLocation(surface, name);
      gl.uniform2f(at('uSize'), width, height);
      for (const layer of layers) {
        const { uniforms } = layer;
        const source = targets[current];
        const target = targets[1 - current];
        if (source === undefined || target === undefined) break;
        const mask = texture(gl, layer.mask, false);
        const logo = texture(gl, layer.logo, true);
        transient.push(mask, logo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        bind(surface, 'uPrev', 0, source.tex);
        bind(surface, 'uBase', 1, photo);
        bind(surface, 'uMask', 2, mask);
        bind(surface, 'uLogo', 3, logo);
        gl.uniform1i(at('uHasMask'), layer.mask === null ? 0 : 1);
        gl.uniform1i(at('uHasPaint'), uniforms.paint === null ? 0 : 1);
        gl.uniform1i(at('uHasLogo'), layer.logo === null ? 0 : 1);
        gl.uniformMatrix3fv(at('uInverse'), false, uniforms.inverse);
        gl.uniform4fv(at('uRect'), uniforms.rect);
        gl.uniform3fv(at('uPaint'), uniforms.paint ?? [0, 0, 0]);
        gl.uniform3fv(at('uTint'), uniforms.tint);
        gl.uniform1i(at('uFinish'), uniforms.finish);
        gl.uniform1f(at('uDisplace'), uniforms.displace);
        gl.uniform1f(at('uWeave'), uniforms.weave);
        gl.uniform1f(at('uLogoLod'), uniforms.logoLod);
        gl.uniform3fv(at('uLight'), uniforms.light);
        gl.uniform3fv(at('uFoilDark'), uniforms.foilDark);
        gl.uniform3fv(at('uFoilLight'), uniforms.foilLight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        current = 1 - current;
      }

      gl.useProgram(copy);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      bind(copy, 'uSource', 0, targets[current]?.tex ?? photo);
      gl.uniform1i(gl.getUniformLocation(copy, 'uFromPhoto'), 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      for (const tex of transient) gl.deleteTexture(tex);
      for (const { tex, fbo } of targets) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      }
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
