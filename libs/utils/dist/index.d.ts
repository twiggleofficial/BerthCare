export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogMetadata = Record<string, unknown>;
export interface Logger {
    debug: (message: string, metadata?: LogMetadata) => void;
    info: (message: string, metadata?: LogMetadata) => void;
    warn: (message: string, metadata?: LogMetadata) => void;
    error: (message: string, metadata?: LogMetadata) => void;
    withScope: (additional: LogMetadata) => Logger;
}
export declare const createLogger: (scope: string, baseContext?: LogMetadata) => Logger;
//# sourceMappingURL=index.d.ts.map