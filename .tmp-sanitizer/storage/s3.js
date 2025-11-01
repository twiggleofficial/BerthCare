"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetS3Client = exports.checkPhotoBucketHealth = exports.generatePhotoUploadUrl = exports.buildPhotoStorageKey = exports.getS3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const node_crypto_1 = require("node:crypto");
const node_http_handler_1 = require("@smithy/node-http-handler");
const node_path_1 = require("node:path");
const logger_1 = require("../logger");
const parse_1 = require("libs/utils/parse");
const DEFAULT_REGION = 'ca-central-1';
const DEFAULT_BUCKET = 'berthcare-local';
const DEFAULT_PRESIGNED_TTL_SECONDS = 15 * 60;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
let s3Client;
const resolveRegion = () => { var _a; return (_a = process.env.AWS_REGION) !== null && _a !== void 0 ? _a : DEFAULT_REGION; };
const resolveBucket = (override) => { var _a, _b; return (_b = (_a = override !== null && override !== void 0 ? override : process.env.AWS_S3_PHOTO_BUCKET) !== null && _a !== void 0 ? _a : process.env.AWS_S3_BUCKET) !== null && _b !== void 0 ? _b : DEFAULT_BUCKET; };
const resolvePresignedTtl = (override) => {
    if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
        return override;
    }
    return (0, parse_1.parseInteger)(process.env.S3_PRESIGNED_TTL_SECONDS, DEFAULT_PRESIGNED_TTL_SECONDS, {
        min: 60,
    });
};
const buildS3Config = () => {
    const region = resolveRegion();
    const forcePathStyle = (0, parse_1.parseBoolean)(process.env.S3_FORCE_PATH_STYLE, false);
    const endpoint = process.env.S3_ENDPOINT;
    const requestTimeout = (0, parse_1.parseInteger)(process.env.S3_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, { min: 1000 });
    const maxAttempts = (0, parse_1.parseInteger)(process.env.S3_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS, {
        min: 1,
        max: 10,
    });
    const config = {
        region,
        maxAttempts,
        requestHandler: new node_http_handler_1.NodeHttpHandler({
            connectionTimeout: requestTimeout,
            requestTimeout,
        }),
    };
    if (endpoint) {
        config.endpoint = endpoint;
    }
    if (forcePathStyle) {
        config.forcePathStyle = true;
    }
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger_1.logger.warn('AWS credentials not found in environment; relying on default provider chain');
    }
    return config;
};
const ensureS3Client = () => {
    var _a;
    if (!s3Client) {
        const config = buildS3Config();
        s3Client = new client_s3_1.S3Client(config);
        logger_1.logger.info('S3 client initialised', {
            region: config.region,
            endpoint: (_a = config.endpoint) !== null && _a !== void 0 ? _a : 'aws',
            forcePathStyle: config.forcePathStyle === true,
        });
    }
    return s3Client;
};
const getS3Client = () => ensureS3Client();
exports.getS3Client = getS3Client;
const buildPhotoStorageKey = ({ visitId, extension, capturedAt, }) => {
    const normalisedExtension = (0, parse_1.normaliseExtension)(extension);
    const safeVisitId = visitId.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
    if (!safeVisitId) {
        throw new Error('Invalid visitId: value must contain at least one safe character');
    }
    let timestampDate;
    if (capturedAt instanceof Date || typeof capturedAt === 'string') {
        const candidate = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
        if (Number.isNaN(candidate.getTime())) {
            logger_1.logger.warn('Invalid capturedAt provided for photo key; falling back to current time', {
                capturedAt,
                visitId: safeVisitId,
            });
            timestampDate = new Date();
        }
        else {
            timestampDate = candidate;
        }
    }
    else {
        timestampDate = new Date();
    }
    const timestamp = timestampDate.toISOString();
    const suffix = normalisedExtension ? `.${normalisedExtension}` : '';
    return `visits/${safeVisitId}/${timestamp}-${(0, node_crypto_1.randomUUID)()}${suffix}`;
};
exports.buildPhotoStorageKey = buildPhotoStorageKey;
const resolveCompressionRatio = (originalBytes, compressedBytes) => {
    if (typeof originalBytes !== 'number' ||
        typeof compressedBytes !== 'number' ||
        !Number.isFinite(compressedBytes) ||
        compressedBytes <= 0) {
        return undefined;
    }
    if (!Number.isFinite(originalBytes)) {
        return undefined;
    }
    return (originalBytes / compressedBytes).toFixed(2);
};
const buildPhotoMetadata = (visitId, metadata) => {
    const result = {
        visit_id: visitId,
    };
    if (!metadata) {
        return result;
    }
    if (metadata.caregiverId) {
        result.caregiver_id = metadata.caregiverId;
    }
    if (metadata.capturedAt) {
        const capturedAt = metadata.capturedAt instanceof Date ? metadata.capturedAt : new Date(metadata.capturedAt);
        if (Number.isNaN(capturedAt.getTime())) {
            logger_1.logger.warn('Invalid capturedAt metadata provided; skipping captured_at field', {
                capturedAt: metadata.capturedAt,
                visitId,
            });
        }
        else {
            result.captured_at = capturedAt.toISOString();
        }
    }
    if (metadata.deviceModel) {
        result.device_model = metadata.deviceModel;
    }
    if (metadata.checksumSha256) {
        result.checksum_sha256 = metadata.checksumSha256;
    }
    if (metadata.compression) {
        const { codec, quality, originalBytes, compressedBytes, width, height } = metadata.compression;
        result.compression_codec = codec;
        if (typeof quality === 'number') {
            result.compression_quality = quality.toString();
        }
        if (typeof originalBytes === 'number') {
            result.original_bytes = originalBytes.toString();
        }
        if (typeof compressedBytes === 'number') {
            result.compressed_bytes = compressedBytes.toString();
        }
        if (typeof width === 'number') {
            result.image_width = width.toString();
        }
        if (typeof height === 'number') {
            result.image_height = height.toString();
        }
        const compressionRatio = resolveCompressionRatio(originalBytes, compressedBytes);
        if (compressionRatio !== undefined) {
            result.compression_ratio = compressionRatio;
        }
    }
    return result;
};
const generatePhotoUploadUrl = async ({ fileName, contentType, visitId, caregiverId, metadata, expiresInSeconds, bucket, }) => {
    const client = ensureS3Client();
    const resolvedBucket = resolveBucket(bucket);
    const rawExtension = (0, node_path_1.extname)(fileName);
    const extension = rawExtension && rawExtension !== '.' ? rawExtension.slice(1) : '';
    const photoKey = (0, exports.buildPhotoStorageKey)({
        visitId,
        extension,
        capturedAt: metadata === null || metadata === void 0 ? void 0 : metadata.capturedAt,
    });
    const ttl = resolvePresignedTtl(expiresInSeconds);
    const command = new client_s3_1.PutObjectCommand({
        Bucket: resolvedBucket,
        Key: photoKey,
        ContentType: contentType,
        Metadata: buildPhotoMetadata(visitId, {
            ...metadata,
            caregiverId,
        }),
    });
    const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn: ttl });
    return {
        uploadUrl,
        photoKey,
        bucket: resolvedBucket,
        expiresInSeconds: ttl,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
};
exports.generatePhotoUploadUrl = generatePhotoUploadUrl;
const checkPhotoBucketHealth = async () => {
    const client = ensureS3Client();
    const bucket = resolveBucket();
    const region = resolveRegion();
    try {
        await client.send(new client_s3_1.HeadBucketCommand({ Bucket: bucket }));
        return {
            healthy: true,
            bucket,
            region,
        };
    }
    catch (error) {
        const err = error;
        logger_1.logger.warn('S3 head bucket failed', {
            bucket,
            message: err.message,
        });
        return {
            healthy: false,
            bucket,
            region,
            error: err.message,
        };
    }
};
exports.checkPhotoBucketHealth = checkPhotoBucketHealth;
const resetS3Client = () => {
    if (s3Client) {
        s3Client.destroy();
        s3Client = undefined;
    }
};
exports.resetS3Client = resetS3Client;
