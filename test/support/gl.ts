export function makeGL2Context(width: number, height: number): WebGL2RenderingContext {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 not available in test browser');
  return gl;
}

export { createTexture, deleteTexture, readTexturePixels } from '~/utils';
