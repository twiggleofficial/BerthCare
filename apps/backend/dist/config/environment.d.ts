export declare const env: {
    nodeEnv: string;
    appEnv: string;
    logLevel: string;
    port: number;
    rateLimit: {
        windowMs: number;
        max: number;
    };
    jwtSecret: string;
    authDemo: {
        email: string;
        passwordHash: string | undefined;
    };
    postgresUrl: string | undefined;
    redisUrl: string | undefined;
    dbPool: {
        min: number;
    };
    shutdownTimeoutMs: number;
    sentry: {
        dsn: string | undefined;
        tracesSampleRate: number;
        profilesSampleRate: number;
        flushTimeoutMs: number;
    };
};
export type AppEnvironment = typeof env;
