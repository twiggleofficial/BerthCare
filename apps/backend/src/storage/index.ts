/**
 * Describes an object persisted in the storage layer.
 */
export interface StorageObject {
  /** Unique identifier used for subsequent operations (e.g., `folder/object.png`). */
  key: string;
  /** Raw binary payload retrieved from storage. */
  data: Buffer;
  /** MIME type reported by the storage provider. */
  contentType: string;
  /** Object size in bytes. */
  size: number;
  /** Optional pre-signed or public URL when available. */
  url?: string;
}

/**
 * Contract for interacting with the storage provider (e.g., S3, GCS).
 */
export interface StorageClient {
  /**
   * Uploads a Buffer and returns metadata about the stored object.
   */
  upload: (key: string, buffer: Buffer, contentType: string) => Promise<StorageObject>;
  /**
   * Retrieves an object by key, returning `null` when it does not exist.
   */
  get: (key: string) => Promise<StorageObject | null>;
  /**
   * Removes an object without erroring when the key is missing (idempotent delete).
   */
  delete: (key: string) => Promise<void>;
}

// Placeholder implementation – real client will integrate with AWS S3 as outlined in architecture docs.
export const createStorageClient = (): StorageClient => {
  const warningMessage = `@berthcare/storage: using placeholder StorageClient (env=${
    process.env.NODE_ENV ?? 'unknown'
  }). Replace with a real provider before production use.`;
  const warningError = new Error('storage placeholder instantiated');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(warningMessage, { cause: warningError });
  }

  console.warn(warningMessage, warningError.stack);

  return {
    upload(key: string, buffer: Buffer, contentType: string): Promise<StorageObject> {
      return Promise.resolve({
        key,
        data: Buffer.from(buffer),
        contentType,
        size: buffer.byteLength,
      });
    },
    get(key: string): Promise<StorageObject | null> {
      void key;
      return Promise.resolve(null);
    },
    delete(key: string): Promise<void> {
      void key;
      return Promise.resolve();
    },
  };
};
