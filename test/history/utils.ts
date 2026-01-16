import { DeflateHistoryBackend, HistoryBackend, TextureHistoryBackend, WebpHistoryBackend } from '~/history';

export const HISTORY_BACKENDS: {
  name: string;
  make: () => HistoryBackend<any>;
}[] = [
  { name: 'deflate', make: () => new DeflateHistoryBackend() },
  { name: 'webp', make: () => new WebpHistoryBackend() },
  { name: 'texture', make: () => new TextureHistoryBackend() },
];
