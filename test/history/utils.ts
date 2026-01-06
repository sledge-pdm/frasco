import { HistoryBackend, TextureHistoryBackend, WebpHistoryBackend } from '../../src/history';

export const HISTORY_BACKENDS: {
  name: string;
  make: () => HistoryBackend<any>;
}[] = [
  { name: 'webp', make: () => new WebpHistoryBackend() },
  { name: 'texture', make: () => new TextureHistoryBackend() },
];
