export interface StorageObject {
  key: string;
  url?: string;
}

export interface StorageClient {
  upload: (key: string, buffer: Buffer, contentType: string) => Promise<StorageObject>;
  delete: (key: string) => Promise<void>;
}

// Placeholder implementation – real client will integrate with AWS S3 as outlined in architecture docs.
export const createStorageClient = (): StorageClient => {
  return {
    upload(key: string, buffer: Buffer, contentType: string): Promise<StorageObject> {
      void buffer;
      void contentType;
      return Promise.resolve({ key });
    },
    delete(key: string): Promise<void> {
      void key;
      return Promise.resolve();
    },
  };
};
