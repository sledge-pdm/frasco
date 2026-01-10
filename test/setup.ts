import { beforeAll } from 'vitest';

import { initWebp } from '@sledge-pdm/core';
import wasmUrl from '@sledge-pdm/core/wasm/libwebp/libwebp.wasm?url';

beforeAll(async () => {
  await initWebp({ wasmUrl });
});
