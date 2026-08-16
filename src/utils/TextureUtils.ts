import { RawPixelData } from '@sledge-pdm/core';
import { SurfaceBounds } from '~/surface';

export function createTexture(gl: WebGL2RenderingContext, width: number, height: number, data?: RawPixelData): WebGLTexture {
  if (data) {
    const expected = width * height * 4;
    if (data.length !== expected) {
      throw new Error(`createTexture: buffer length ${data.length} !== expected ${expected}`);
    }
  }
  const tex = gl.createTexture();
  if (!tex) throw new Error('Layer: failed to create texture');

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data ?? null);
  return tex;
}

export function deleteTexture(gl: WebGL2RenderingContext, texture: WebGLTexture) {
  gl.deleteTexture(texture);
}

export function readTexturePixels(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  bounds: SurfaceBounds,
  framebuffer?: WebGLFramebuffer
): Uint8Array {
  const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
  const fbo = framebuffer ?? gl.createFramebuffer();
  if (!fbo) throw new Error('readTexturePixels: failed to create framebuffer');

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
  const out = new Uint8Array(bounds.width * bounds.height * 4);
  gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, out);

  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
  if (!framebuffer) gl.deleteFramebuffer(fbo);
  return out;
}

export type ReadTexturePixelsAsyncOptions = {
  /** flip rows while copying on the GPU, so no CPU pass over the buffer is needed afterwards. */
  flipY?: boolean;
  /** give up waiting on the fence after this long and read synchronously instead. */
  fenceTimeoutMs?: number;
};

/**
 * @description the slowest readback measured on real hardware was 28ms for a 2048x2048 layer, so this is
 *   a detector for a fence that is never going to signal, not a tuning knob.
 */
const DEFAULT_FENCE_TIMEOUT_MS = 1000;

/**
 * @description read a texture back without blocking on the GPU.
 *   `readPixels` into a pixel pack buffer only queues the copy; the fence tells us when it landed, and
 *   waiting on it is done by yielding to the event loop rather than stalling the main thread. the total
 *   time is longer than the synchronous read - what it buys is that nothing else is frozen meanwhile.
 *   falls back to the synchronous read where fences are unavailable.
 */
export async function readTexturePixelsAsync(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  bounds: SurfaceBounds,
  options?: ReadTexturePixelsAsyncOptions
): Promise<Uint8Array> {
  const { width, height } = bounds;
  const byteLength = width * height * 4;

  // the flip is a blit away while the pixels are still on the GPU, so it never costs a pass over the buffer.
  const flipped = options?.flipY ? blitFlipped(gl, texture, bounds) : undefined;
  const source = flipped ?? texture;
  const origin = flipped ? { x: 0, y: 0 } : { x: bounds.x, y: bounds.y };

  const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
  const fbo = gl.createFramebuffer();
  const pbo = gl.createBuffer();
  if (!fbo || !pbo) {
    if (fbo) gl.deleteFramebuffer(fbo);
    if (pbo) gl.deleteBuffer(pbo);
    if (flipped) gl.deleteTexture(flipped);
    throw new Error('readTexturePixelsAsync: failed to allocate readback resources');
  }

  let sync: WebGLSync | null = null;
  try {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, source, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, byteLength, gl.STREAM_READ);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.readPixels(origin.x, origin.y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, 0);

    sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      // no fence to wait on, so there is nothing to gain over reading straight back
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
      return readTexturePixels(gl, source, { ...origin, width, height });
    }
    gl.flush();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);

    const signalled = await waitForSync(gl, sync, options?.fenceTimeoutMs ?? DEFAULT_FENCE_TIMEOUT_MS);
    if (!signalled) {
      // a fence that never signals would otherwise leave this promise unsettled forever, and with it every
      // save sharing the in-flight one. a lost context cannot produce pixels at all; anything else falls
      // back to the blocking read, which costs a stall but always returns.
      if (gl.isContextLost()) throw new Error('readTexturePixelsAsync: context lost while waiting for the fence');
      return readTexturePixels(gl, source, { ...origin, width, height });
    }

    // anything could have run while we were yielding, so bind again rather than trusting the state
    const out = new Uint8Array(byteLength);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, out);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    return out;
  } finally {
    if (sync) gl.deleteSync(sync);
    gl.deleteBuffer(pbo);
    gl.deleteFramebuffer(fbo);
    if (flipped) gl.deleteTexture(flipped);
  }
}

/** @description copy `bounds` of `texture` into a new texture with its rows reversed. */
function blitFlipped(gl: WebGL2RenderingContext, texture: WebGLTexture, bounds: SurfaceBounds): WebGLTexture {
  const { width, height } = bounds;
  const dest = createTexture(gl, width, height, undefined);
  const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
  const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
  const readFbo = gl.createFramebuffer();
  const drawFbo = gl.createFramebuffer();

  try {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dest, 0);
    // destination Y runs backwards, which is the flip
    gl.blitFramebuffer(bounds.x, bounds.y, bounds.x + width, bounds.y + height, 0, height, width, 0, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  } finally {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
    gl.deleteFramebuffer(readFbo);
    gl.deleteFramebuffer(drawFbo);
  }
  return dest;
}

/** @description resolves true once the fence signalled, false once `timeoutMs` passed without it. */
function waitForSync(gl: WebGL2RenderingContext, sync: WebGLSync, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + timeoutMs;
    const poll = () => {
      const status = gl.clientWaitSync(sync, 0, 0);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        resolve(true);
        return;
      }
      if (status === gl.WAIT_FAILED) {
        reject(new Error('readTexturePixelsAsync: clientWaitSync failed'));
        return;
      }
      if (performance.now() >= deadline) {
        resolve(false);
        return;
      }
      scheduleRetry(poll);
    };
    poll();
  });
}

const retryQueue: (() => void)[] = [];
let retryChannel: MessageChannel | undefined;

/**
 * @description run `fn` on the next macrotask without the clamping `setTimeout` applies once nested.
 *   the fence is usually ready within a frame, and a 4ms floor per poll would dominate the readback.
 */
function scheduleRetry(fn: () => void): void {
  if (typeof MessageChannel === 'undefined') {
    setTimeout(fn, 0);
    return;
  }
  if (!retryChannel) {
    retryChannel = new MessageChannel();
    retryChannel.port1.onmessage = () => retryQueue.shift()?.();
    retryChannel.port1.start();
  }
  retryQueue.push(fn);
  retryChannel.port2.postMessage(0);
}
