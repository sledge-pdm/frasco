import {
  CircleKernel,
  COPY_FRAG_300ES,
  DeflateHistoryBackend,
  DirectStrokeInstrument,
  FULLSCREEN_VERT_300ES,
  Grip,
  GripInstrument,
  GripKernel,
  GripPoint,
  GripStrokeStyle,
  Layer,
  LinePreviewInstrument,
  MaskStrokeInstrument,
  SquareKernel,
  TextureHistoryBackend,
  WebpHistoryBackend,
} from '../index';

const canvas = document.getElementById('screen') as HTMLCanvasElement | null;
const kernelSelect = document.getElementById('kernel') as HTMLSelectElement | null;
const instrumentSelect = document.getElementById('instrument') as HTMLSelectElement | null;
const sizeInput = document.getElementById('size') as HTMLInputElement | null;
const opacityInput = document.getElementById('opacity') as HTMLInputElement | null;
const colorInput = document.getElementById('color') as HTMLInputElement | null;
const historyBackendSelect = document.getElementById('historyBackend') as HTMLSelectElement | null;
const useRawUpdateInput = document.getElementById('useRawUpdate') as HTMLInputElement | null;
const eventStats = document.getElementById('eventStats') as HTMLDivElement | null;
const undoButton = document.getElementById('undo') as HTMLButtonElement | null;
const redoButton = document.getElementById('redo') as HTMLButtonElement | null;
const clearButton = document.getElementById('clear') as HTMLButtonElement | null;
const downloadPngButton = document.getElementById('downloadPng') as HTMLButtonElement | null;

if (
  !canvas ||
  !kernelSelect ||
  !instrumentSelect ||
  !sizeInput ||
  !opacityInput ||
  !colorInput ||
  !historyBackendSelect ||
  !useRawUpdateInput ||
  !eventStats ||
  !clearButton
) {
  throw new Error('Manual: missing required elements');
}

const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
if (!gl) {
  throw new Error('Manual: WebGL2 not available');
}

const layer = new Layer(gl, { width: 1, height: 1 });
applyHistoryBackend();
const grip = new Grip({ inputSpace: 'canvas' });

const kernels = new Map<string, GripKernel>([
  ['circle', new CircleKernel()],
  ['square', new SquareKernel()],
]);
let kernel = kernels.get(kernelSelect.value) ?? new CircleKernel();
const instruments = new Map<string, GripInstrument>([
  ['direct_stroke', new DirectStrokeInstrument()],
  ['mask_stroke', new MaskStrokeInstrument()],
  ['line_preview', new LinePreviewInstrument()],
]);
let instrument = instruments.get(instrumentSelect.value) ?? new MaskStrokeInstrument();

const display = createDisplayProgram(gl);
let drawing = false;
let rawCount = 0;
let moveCount = 0;
let lastEvent = '-';

const handlePointerRawUpdate = (evt: Event) => {
  if (!drawing) return;
  rawCount += 1;
  lastEvent = 'raw';
  updateEventStats();
  grip.addPoint(toLayerPoint(evt as PointerEvent));
};
const handlePointerMove = (evt: PointerEvent) => {
  if (!drawing) return;
  moveCount += 1;
  lastEvent = 'move';
  updateEventStats();
  grip.addPoint(toLayerPoint(evt));
};

useRawUpdateInput.addEventListener('change', (e) => {
  updateMoveListener();
});
updateMoveListener();

kernelSelect.addEventListener('change', () => {
  kernel = kernels.get(kernelSelect.value) ?? new CircleKernel();
});
instrumentSelect.addEventListener('change', () => {
  instrument = instruments.get(instrumentSelect.value) ?? new MaskStrokeInstrument();
});

historyBackendSelect.addEventListener('change', () => {
  applyHistoryBackend();
});

function applyHistoryBackend(): void {
  if (!historyBackendSelect) throw new Error('history backend select not defined');
  switch (historyBackendSelect.value) {
    case 'deflate':
      layer.setHistoryBackend(new DeflateHistoryBackend());
      break;
    case 'texture':
      layer.setHistoryBackend(new TextureHistoryBackend());
      break;
    case 'webp':
      layer.setHistoryBackend(new WebpHistoryBackend());
      break;
  }
}

function updateMoveListener() {
  if (canvas === null || useRawUpdateInput === null) throw new Error('elements not defined');

  canvas.removeEventListener('pointerrawupdate', handlePointerRawUpdate);
  canvas.removeEventListener('pointermove', handlePointerMove);

  const supportsRawUpdate = 'onpointerrawupdate' in window;
  if (!supportsRawUpdate) {
    useRawUpdateInput.checked = false;
    useRawUpdateInput.disabled = true;
  }

  if (useRawUpdateInput.checked && supportsRawUpdate) {
    canvas.addEventListener('pointerrawupdate', handlePointerRawUpdate);
  } else {
    canvas.addEventListener('pointermove', handlePointerMove);
  }
}

function readStyle(): GripStrokeStyle {
  if (colorInput === null || sizeInput === null || opacityInput === null) throw new Error('style elements not defined');
  return {
    color: hexToRgba(colorInput.value),
    size: Number(sizeInput.value),
    opacity: Number(opacityInput.value),
  };
}

function toLayerPoint(evt: PointerEvent): GripPoint {
  if (canvas === null) throw new Error('canvas not defined');

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((evt.clientX - rect.left) * scaleX);
  const y = Math.floor((evt.clientY - rect.top) * scaleY);
  return {
    x,
    y,
    pressure: evt.pressure,
    time: evt.timeStamp,
    style: readStyle(),
  };
}

function resizeCanvas(): void {
  if (canvas === null) throw new Error('canvas not defined');

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  layer.resize(width, height);
}

function clearLayer(): void {
  layer.clear([0, 0, 0, 0]);
}

function render(): void {
  if (canvas === null) throw new Error('canvas not defined');
  if (gl === null) throw new Error('WebGL not available');

  resizeCanvas();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.BLEND);
  gl.clearColor(1, 1, 1, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(display.program);
  gl.bindVertexArray(display.vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, layer.getTextureHandle());
  if (display.srcUniform) gl.uniform1i(display.srcUniform, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
  gl.useProgram(null);

  requestAnimationFrame(render);
}

canvas.addEventListener('pointerdown', (evt) => {
  canvas.setPointerCapture(evt.pointerId);
  drawing = true;
  rawCount = 0;
  moveCount = 0;
  lastEvent = 'down';
  updateEventStats();
  grip.start(layer, kernel, toLayerPoint(evt), instrument);
});

function finishStroke(evt: PointerEvent): void {
  if (!drawing) return;
  drawing = false;
  lastEvent = 'up';
  updateEventStats();
  try {
    grip.end(toLayerPoint(evt));
  } catch {
    grip.cancel();
  }
}

canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);
canvas.addEventListener('pointerleave', finishStroke);

clearButton.addEventListener('click', () => {
  clearLayer();
});

clearLayer();
requestAnimationFrame(render);

type DisplayProgram = {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  srcUniform: WebGLUniformLocation | null;
};

function createDisplayProgram(gl2: WebGL2RenderingContext): DisplayProgram {
  const vs = compileShader(gl2, gl2.VERTEX_SHADER, FULLSCREEN_VERT_300ES);
  const fs = compileShader(gl2, gl2.FRAGMENT_SHADER, COPY_FRAG_300ES);
  const program = linkProgram(gl2, vs, fs);
  gl2.deleteShader(vs);
  gl2.deleteShader(fs);

  const vao = gl2.createVertexArray();
  const vbo = gl2.createBuffer();
  if (!vao || !vbo) throw new Error('Manual: failed to create display buffers');

  gl2.bindVertexArray(vao);
  gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
  gl2.bufferData(gl2.ARRAY_BUFFER, vertices, gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(0);
  gl2.vertexAttribPointer(0, 2, gl2.FLOAT, false, 0, 0);
  gl2.bindVertexArray(null);
  gl2.bindBuffer(gl2.ARRAY_BUFFER, null);

  const srcUniform = gl2.getUniformLocation(program, 'u_src');
  return { program, vao, srcUniform };
}

function compileShader(gl2: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl2.createShader(type);
  if (!shader) throw new Error('Manual: failed to create shader');
  gl2.shaderSource(shader, source);
  gl2.compileShader(shader);
  if (!gl2.getShaderParameter(shader, gl2.COMPILE_STATUS)) {
    const info = gl2.getShaderInfoLog(shader) ?? 'unknown';
    gl2.deleteShader(shader);
    throw new Error(`Manual: shader compile error: ${info}`);
  }
  return shader;
}

function linkProgram(gl2: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl2.createProgram();
  if (!program) throw new Error('Manual: failed to create program');
  gl2.attachShader(program, vs);
  gl2.attachShader(program, fs);
  gl2.linkProgram(program);
  if (!gl2.getProgramParameter(program, gl2.LINK_STATUS)) {
    const info = gl2.getProgramInfoLog(program) ?? 'unknown';
    gl2.deleteProgram(program);
    throw new Error(`Manual: program link error: ${info}`);
  }
  return program;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b, 255];
}

function updateEventStats(): void {
  if (eventStats === null) return;
  eventStats.textContent = `move: ${moveCount} / raw: ${rawCount} / last: ${lastEvent}`;
}

downloadPngButton?.addEventListener('click', () => {
  downloadPng();
});

function downloadPng() {
  const buffer = layer.exportRaw({ flipY: true });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = layer.getWidth();
  const height = layer.getHeight();
  canvas.width = width;
  canvas.height = height;

  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);

  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png', 0.8);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'download.png';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

undoButton?.addEventListener('click', () => {
  if (layer.canUndo()) layer.undo();
  else console.warn('cannot undo');
});

redoButton?.addEventListener('click', () => {
  if (layer.canRedo()) layer.redo();
  else console.warn('cannot redo');
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.ctrlKey) {
    if (e.key === 'z') {
      if (layer.canUndo()) layer.undo();
      else console.warn('cannot undo');
    }
    if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
      if (layer.canRedo()) layer.redo();
      else console.warn('cannot redo');
    }
  }
});
