export type E2EImage = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export type E2EImageSet = {
  original: E2EImage;
  applied: E2EImage;
};

export async function loadImageData(url: URL): Promise<E2EImage | undefined> {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`E2E: failed to load image ${url.href}`);
    return undefined;
  }
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('E2E: 2D canvas context not available');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: imageData.data, width: canvas.width, height: canvas.height };
}

export async function loadVerifySet(name: string, setUrl: URL, ext = 'webp'): Promise<E2EImageSet | undefined> {
  const original = await loadImageData(new URL(`original.${ext}`, setUrl));
  const applied = await loadImageData(new URL(`applied.${ext}`, setUrl));
  if (!original || !applied) {
    console.warn(`E2E ${name}: missing images at ${setUrl.href}`);
    return undefined;
  }
  if (original.width !== applied.width || original.height !== applied.height) {
    console.warn(
      `E2E ${name}: size mismatch between original (${original.width}x${original.height}) and applied (${applied.width}x${applied.height})`
    );
  }
  return { original, applied };
}

export async function loadVerifySets(
  name: string,
  baseUrl: string | URL,
  setNames: string[] = ['root'],
  ext = 'webp'
): Promise<Map<string, E2EImageSet> | undefined> {
  const base = typeof baseUrl === 'string' ? new URL(baseUrl) : baseUrl;
  const result = new Map<string, E2EImageSet>();

  for (const setName of setNames) {
    const path = setName === 'root' ? './image/' : `./image/${setName}/`;
    const setUrl = new URL(path, base);
    const set = await loadVerifySet(name, setUrl, ext);
    if (set) result.set(setName, set);
  }

  if (result.size === 0) {
    console.error(`E2E ${name}: no available image sets`);
    return undefined;
  }

  return result;
}

export function verifySets(
  name: string,
  sets: Map<string, E2EImageSet>,
  apply: (original: E2EImage) => Uint8Array
): void {
  for (const [key, set] of sets.entries()) {
    const result = apply(set.original);
    const expected = set.applied.data;
    if (!isBufferEqual(result, expected)) {
      throw new Error(`E2E ${name} / set "${key}": result not equal to expected applied image`);
    }
  }
}

function isBufferEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
