import type { Logger } from 'winston';
export type { Logger };
export declare const rootLogger: Logger;
export declare const createLogger: (scope: string) => Logger;
export declare const serializeError: (error: unknown) => {
    name: string;
    message: string;
    stack: string | undefined;
    detail?: undefined;
} | {
    name: string;
    message: string;
    detail: string;
    stack?: undefined;
} | {
    name: string;
    message: string;
    stack?: undefined;
    detail?: undefined;
};
