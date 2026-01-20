import { DeflateHistoryBackend, HistoryBackend, TextureHistoryBackend } from '~/history';

export const HISTORY_BACKENDS: {
  name: string;
  make: () => HistoryBackend<any>;
}[] = [
  { name: 'deflate', make: () => new DeflateHistoryBackend() },
  { name: 'texture', make: () => new TextureHistoryBackend() },
];
