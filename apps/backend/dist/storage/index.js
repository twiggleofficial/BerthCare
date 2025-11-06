// Placeholder implementation – real client will integrate with AWS S3 as outlined in architecture docs.
export const createStorageClient = () => {
    return {
        upload(key, buffer, contentType) {
            void buffer;
            void contentType;
            return Promise.resolve({ key });
        },
        delete(key) {
            void key;
            return Promise.resolve();
        },
    };
};
