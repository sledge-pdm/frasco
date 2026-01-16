import type { Layer } from '~/layer';

export type Effect<Options> = {
  apply(layer: Layer, options?: Options): void;
};
