const assets = new Map<string, File>();

export function registerMediaAsset(path: string, file: File): void {
  if (!path) {
    return;
  }
  assets.set(path, file);
}

export function unregisterMediaAsset(path: string): void {
  assets.delete(path);
}

export function mediaAssetForPath(path: string): File | null {
  return assets.get(path) ?? null;
}

export function clearMediaAssets(): void {
  assets.clear();
}
