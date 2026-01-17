import { applyTheme, Button, Checkbox, Dropdown, type DropdownOption, Slider } from '@sledge-pdm/ui';
import { createEffect, createSignal, onMount } from 'solid-js';
import {
  BlendMode,
  CircleKernel,
  DeflateHistoryBackend,
  DirectStrokeInstrument,
  Frasco,
  Grip,
  type GripInstrument,
  type GripKernel,
  type GripPoint,
  type GripStrokeStyle,
  Layer,
  LinePreviewInstrument,
  MaskStrokeInstrument,
  SquareKernel,
  TextureHistoryBackend,
  WebpHistoryBackend,
} from '../index';

type KernelType = 'circle' | 'square';
type InstrumentType = 'direct_stroke' | 'mask_stroke' | 'line_preview';
type HistoryBackendType = 'deflate' | 'webp' | 'texture';

const kernelOptions: DropdownOption<KernelType>[] = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
];

const instrumentOptions: DropdownOption<InstrumentType>[] = [
  { label: 'Direct Stroke', value: 'direct_stroke' },
  { label: 'Mask Stroke', value: 'mask_stroke' },
  { label: 'Line Preview', value: 'line_preview' },
];

const historyBackendOptions: DropdownOption<HistoryBackendType>[] = [
  { label: 'Deflate', value: 'deflate' },
  { label: 'Webp', value: 'webp' },
  { label: 'Texture', value: 'texture' },
];

const colorOptions: DropdownOption<string>[] = [
  { label: 'Red', value: '#ff2d2d' },
  { label: 'Blue', value: '#2d7fff' },
  { label: 'Green', value: '#35d04b' },
  { label: 'Yellow', value: '#ffd83d' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
];

export default function App() {
  const [kernel, setKernel] = createSignal<KernelType>('circle');
  const [instrument, setInstrument] = createSignal<InstrumentType>('mask_stroke');
  const [size, setSize] = createSignal(30);
  const [opacityPercent, setOpacityPercent] = createSignal(100);
  const [color, setColor] = createSignal(colorOptions[0].value);
  const [historyBackend, setHistoryBackend] = createSignal<HistoryBackendType>('texture');
  const [useRawUpdate, setUseRawUpdate] = createSignal(true);
  const [rawUpdateSupported, setRawUpdateSupported] = createSignal(true);
  const [eventStats, setEventStats] = createSignal('move: 0 / raw: 0 / last: -');

  let canvasRef: HTMLCanvasElement | undefined;
  let gl: WebGL2RenderingContext | null = null;
  let layer: Layer | null = null;
  let grip: Grip | null = null;
  let frasco: Frasco | null = null;
  let pendingFrame = 0;
  let renderQueued = false;

  const kernels: Record<KernelType, GripKernel> = {
    circle: new CircleKernel(),
    square: new SquareKernel(),
  };

  const instruments: Record<InstrumentType, GripInstrument> = {
    direct_stroke: new DirectStrokeInstrument(),
    mask_stroke: new MaskStrokeInstrument(),
    line_preview: new LinePreviewInstrument(),
  };

  const updateEventStats = (moveCount: number, rawCount: number, lastEvent: string) => {
    setEventStats(`move: ${moveCount} / raw: ${rawCount} / last: ${lastEvent}`);
  };

  const readStyle = (): GripStrokeStyle => {
    return {
      color: hexToRgba(color()),
      size: size(),
      opacity: opacityPercent() / 100,
    };
  };

  const toLayerPoint = (evt: PointerEvent): GripPoint => {
    if (!canvasRef) throw new Error('Manual: canvas not defined');

    const rect = canvasRef.getBoundingClientRect();
    const scaleX = canvasRef.width / rect.width;
    const scaleY = canvasRef.height / rect.height;
    const x = Math.floor((evt.clientX - rect.left) * scaleX);
    const y = Math.floor((evt.clientY - rect.top) * scaleY);
    return {
      x,
      y,
      pressure: evt.pressure,
      time: evt.timeStamp,
      style: readStyle(),
    };
  };

  const resizeCanvas = () => {
    if (!canvasRef || !layer) return;

    const rect = canvasRef.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvasRef.width === width && canvasRef.height === height) return;
    canvasRef.width = width;
    canvasRef.height = height;
    layer.resizeClear(width, height);
    frasco?.resize({ width, height });
  };

  const clearLayer = () => {
    layer?.clear([0, 0, 0, 0]);
    layer?.clearHistory();
    setCanUndo(false);
    setCanRedo(false);
    scheduleRender();
  };

  const renderFrame = () => {
    if (!canvasRef || !layer || !frasco) return;

    frasco.compose(
      [
        {
          texture: layer.getTextureHandle(),
          opacity: 1,
          blendMode: BlendMode.normal,
        },
      ],
      {
        size: { width: canvasRef.width, height: canvasRef.height },
        baseColor: [0, 0, 0, 0],
      }
    );
  };

  const scheduleRender = () => {
    if (renderQueued) return;
    renderQueued = true;
    pendingFrame = requestAnimationFrame(() => {
      renderQueued = false;
      renderFrame();
    });
  };

  const applyHistoryBackend = (backend: HistoryBackendType) => {
    if (!layer) return;
    switch (backend) {
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
  };

  const downloadPng = () => {
    if (!layer) return;

    const buffer = layer.readPixels({ flipY: true });
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
  };

  const [canUndo, setCanUndo] = createSignal<boolean>(false);
  const [canRedo, setCanRedo] = createSignal<boolean>(false);

  onMount(() => {
    applyTheme('os');

    if (!canvasRef) throw new Error('Manual: missing canvas');
    gl = canvasRef.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) throw new Error('Manual: WebGL2 not available');

    layer = new Layer(gl, { width: 1, height: 1 });
    applyHistoryBackend(historyBackend());
    grip = new Grip({ inputSpace: 'canvas' });
    frasco = new Frasco(gl);

    const onHistoryChange = () => {
      setCanUndo(layer?.canUndo() ?? false);
      setCanRedo(layer?.canRedo() ?? false);
      scheduleRender();
    };
    layer.addListener('historyRegistered', onHistoryChange);
    layer.addListener('historyApplied', onHistoryChange);

    resizeCanvas();
    scheduleRender();

    let drawing = false;
    let rawCount = 0;
    let moveCount = 0;
    let lastEvent = '-';

    const supportsRawUpdate = 'onpointerrawupdate' in window;
    setRawUpdateSupported(supportsRawUpdate);
    if (!supportsRawUpdate) setUseRawUpdate(false);

    const handlePointerRawUpdate = (evt: Event) => {
      if (!drawing || !grip) return;
      rawCount += 1;
      lastEvent = 'raw';
      updateEventStats(moveCount, rawCount, lastEvent);
      grip.addPoint(toLayerPoint(evt as PointerEvent));
      scheduleRender();
    };

    const handlePointerMove = (evt: PointerEvent) => {
      if (!drawing || !grip) return;
      moveCount += 1;
      lastEvent = 'move';
      updateEventStats(moveCount, rawCount, lastEvent);
      grip.addPoint(toLayerPoint(evt));
      scheduleRender();
    };

    const onPointerDown = (evt: PointerEvent) => {
      if (!layer || !grip || !canvasRef) return;
      canvasRef.setPointerCapture(evt.pointerId);
      drawing = true;
      rawCount = 0;
      moveCount = 0;
      lastEvent = 'down';
      updateEventStats(moveCount, rawCount, lastEvent);
      grip.start(layer, kernels[kernel()], toLayerPoint(evt), instruments[instrument()]);
      scheduleRender();
    };

    const finishStroke = (evt: PointerEvent) => {
      if (!drawing || !grip) return;
      drawing = false;
      lastEvent = 'up';
      updateEventStats(moveCount, rawCount, lastEvent);
      try {
        grip.end(toLayerPoint(evt));
      } catch {
        grip.cancel();
      }
      scheduleRender();
    };

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (!layer) return;
      if (evt.ctrlKey) {
        if (evt.key === 'z') {
          if (layer.canUndo()) {
            layer.undo();
            scheduleRender();
          }
        }
        if (evt.key === 'y' || (evt.shiftKey && evt.key === 'z')) {
          if (layer.canRedo()) {
            layer.redo();
            scheduleRender();
          }
        }
      }
    };

    createEffect(() => {
      const useRaw = useRawUpdate();
      if (!canvasRef) return;
      canvasRef.removeEventListener('pointerrawupdate', handlePointerRawUpdate);
      canvasRef.removeEventListener('pointermove', handlePointerMove);

      if (useRaw && rawUpdateSupported()) {
        canvasRef.addEventListener('pointerrawupdate', handlePointerRawUpdate);
      } else {
        canvasRef.addEventListener('pointermove', handlePointerMove);
      }
    });

    canvasRef.addEventListener('pointerdown', onPointerDown);
    canvasRef.addEventListener('pointerup', finishStroke);
    canvasRef.addEventListener('pointercancel', finishStroke);
    canvasRef.addEventListener('pointerleave', finishStroke);
    window.addEventListener('keydown', handleKeyDown);

    clearLayer();

    return () => {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      canvasRef?.removeEventListener('pointerrawupdate', handlePointerRawUpdate);
      canvasRef?.removeEventListener('pointermove', handlePointerMove);
      canvasRef?.removeEventListener('pointerdown', onPointerDown);
      canvasRef?.removeEventListener('pointerup', finishStroke);
      canvasRef?.removeEventListener('pointercancel', finishStroke);
      canvasRef?.removeEventListener('pointerleave', finishStroke);
      window.removeEventListener('keydown', handleKeyDown);

      layer?.removeListener('historyRegistered', onHistoryChange);
      layer?.removeListener('historyApplied', onHistoryChange);
      frasco?.dispose();
    };
  });

  createEffect(() => {
    if (!layer) return;
    applyHistoryBackend(historyBackend());
  });

  const handleRawUpdateChange = (checked: boolean) => {
    if (!rawUpdateSupported()) {
      setUseRawUpdate(false);
      return;
    }
    setUseRawUpdate(checked);
  };

  return (
    <div class='frasco-root page-root'>
      <section class='frasco-panel'>
        <div class='control-list'>
          <p>Frasco Grip Manual</p>
          <div class='control-block'>
            <p>Shape</p>
            <Dropdown value={kernel()} options={kernelOptions} onChange={setKernel} />
          </div>
          <div class='control-block'>
            <p>Behaviour</p>
            <Dropdown value={instrument()} options={instrumentOptions} onChange={setInstrument} />
          </div>
          <div class='control-block'>
            <p>Size</p>
            <Slider min={1} max={64} value={size()} onChange={setSize} labelMode='left' customFormat={(v) => `${v} px`} />
          </div>
          <div class='control-block'>
            <p>Opacity</p>
            <Slider min={0} max={100} value={opacityPercent()} onChange={setOpacityPercent} labelMode='left' customFormat={(v) => `${v} %`} />
          </div>
          <div class='control-block'>
            <p>Color</p>
            <Dropdown value={color()} options={colorOptions} onChange={setColor} />
          </div>
          <div class='control-block'>
            <p>History Backend</p>
            <Dropdown value={historyBackend()} options={historyBackendOptions} onChange={setHistoryBackend} />
          </div>
          <div class='control-block'>
            <Checkbox label='Use PointerRawUpdate' checked={useRawUpdate()} onChange={handleRawUpdateChange} />
          </div>
          <p>{eventStats()}</p>
          <div class='control-actions'>
            <Button type='button' onClick={clearLayer}>
              Clear
            </Button>
            <Button type='button' onClick={downloadPng}>
              Download PNG
            </Button>
          </div>
        </div>
      </section>
      <section class='frasco-stage'>
        <canvas ref={(el) => (canvasRef = el)} class='frasco-canvas' />
        <svg width='0' height='0'>
          <defs>
            <clipPath id='clipPath-undo'>
              <path
                d='M 2 5 L 3 5 L 3 4 L 1 4 L 1 3 L 0 3 L 0 2 L 1 2 L 1 1 L 3 1 L 3 0 L 2 0 L 2 2 L 7 2 L 7 8 L 1 8 L 1 7 L 8 7 L 8 3 L 2 3 L 2 5 Z'
                fill='black'
                transform='scale(3)'
              />
            </clipPath>
            <clipPath id='clipPath-redo'>
              <path
                d='M 5 1 L 7 1 L 7 2 L 8 2 L 8 3 L 7 3 L 7 4 L 5 4 L 5 5 L 6 5 L 6 3 L 0 3 L 0 7 L 7 7 L 7 8 L 1 8 L 1 2 L 6 2 L 6 0 L 5 0 L 5 1 Z'
                fill='black'
                transform='scale(3)'
              />
            </clipPath>
          </defs>
        </svg>
        <div class='undo-redo-nav'>
          <div
            class='undo-redo-button'
            style={{ cursor: canUndo() ? 'pointer' : 'unset' }}
            onClick={(e) => {
              e.stopImmediatePropagation();
              if (!layer?.canUndo()) return;
              layer.undo();
              scheduleRender();
            }}
          >
            <div class='undo-icon' style={{ 'clip-path': 'url(#clipPath-undo)', opacity: canUndo() ? '1.0' : '0.3' }} />
          </div>
          <div
            class='undo-redo-button'
            style={{ cursor: canRedo() ? 'pointer' : 'unset' }}
            onClick={(e) => {
              e.stopImmediatePropagation();
              if (!layer?.canRedo()) return;
              layer.redo();
              scheduleRender();
            }}
          >
            <div class='redo-icon' style={{ 'clip-path': 'url(#clipPath-redo)', opacity: canRedo() ? '1.0' : '0.3' }} />
          </div>
        </div>
      </section>
    </div>
  );
}

function hexToRgba(hex: string): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b, 255];
}
