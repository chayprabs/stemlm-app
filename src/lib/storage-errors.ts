/** Thrown when extension storage.local exceeds its quota. */
export class StorageQuotaError extends Error {
  constructor(message = 'Browser storage is full. Delete old saved sessions and try again.') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export function isStorageQuotaError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('quota') || msg.includes('exceeded');
}
