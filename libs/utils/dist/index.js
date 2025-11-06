const LOG_PRIORITY = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const isValidLogLevel = (candidate) => {
    return candidate in LOG_PRIORITY;
};
const resolveLogLevel = () => {
    const candidate = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
    return isValidLogLevel(candidate) ? candidate : 'info';
};
const activeLevel = resolveLogLevel();
const shouldLog = (level) => {
    return LOG_PRIORITY[level] >= LOG_PRIORITY[activeLevel];
};
const serializeValue = (value, seen = new WeakSet()) => {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) {
            return '[Circular]';
        }
        seen.add(value);
        return value.map((entry) => serializeValue(entry, seen));
    }
    if (value && typeof value === 'object') {
        if (seen.has(value)) {
            return '[Circular]';
        }
        seen.add(value);
        const result = {};
        Object.entries(value).forEach(([key, entry]) => {
            result[key] = serializeValue(entry, seen);
        });
        return result;
    }
    return value;
};
const normalizeMetadata = (metadata) => {
    if (!metadata) {
        return {};
    }
    return Object.entries(metadata).reduce((accumulator, [key, value]) => {
        accumulator[key] = serializeValue(value);
        return accumulator;
    }, {});
};
const emit = (scope, level, message, baseContext, metadata) => {
    if (!shouldLog(level)) {
        return;
    }
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        scope,
        message,
        ...baseContext,
        ...normalizeMetadata(metadata),
    };
    const serialized = JSON.stringify(payload);
    if (level === 'error') {
        console.error(serialized);
        return;
    }
    if (level === 'warn') {
        console.warn(serialized);
        return;
    }
    if (level === 'debug') {
        console.debug(serialized);
        return;
    }
    console.log(serialized);
};
export const createLogger = (scope, baseContext = {}) => {
    const normalizedBase = normalizeMetadata(baseContext);
    const log = (level) => {
        return (message, metadata) => emit(scope, level, message, normalizedBase, metadata);
    };
    return {
        debug: log('debug'),
        info: log('info'),
        warn: log('warn'),
        error: log('error'),
        withScope: (additional) => createLogger(scope, { ...normalizedBase, ...additional }),
    };
};
