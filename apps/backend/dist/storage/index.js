// Placeholder implementation – real client will integrate with AWS S3 as outlined in architecture docs.
export const createStorageClient = () => {
    const warningMessage = `@berthcare/storage: using placeholder StorageClient (env=${process.env.NODE_ENV ?? 'unknown'}). Replace with a real provider before production use.`;
    const warningError = new Error('storage placeholder instantiated');
    if (process.env.NODE_ENV === 'production') {
        throw new Error(warningMessage, { cause: warningError });
    }
    console.warn(warningMessage, warningError.stack);
    return {
        upload(key, buffer, contentType) {
            return Promise.resolve({
                key,
                data: buffer,
                contentType,
                size: buffer.byteLength,
            });
        },
        get(key) {
            void key;
            return Promise.resolve(null);
        },
        delete(key) {
            void key;
            return Promise.resolve();
        },
    };
};
