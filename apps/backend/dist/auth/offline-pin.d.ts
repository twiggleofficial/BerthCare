export type PinHashParams = {
    algorithm: string;
    N: number;
    r: number;
    p: number;
    keylen: number;
};
export type PinHash = {
    hash: string;
    salt: string;
    params: PinHashParams;
};
type LegacyPinHash = {
    hash: string;
    salt: string;
    params: string;
};
type StoredPinHash = PinHash | LegacyPinHash;
export declare class PinPolicyError extends Error {
    readonly code = "PIN_POLICY_VIOLATION";
    constructor(message: string);
}
export declare const validatePin: (pin: string) => void;
export declare const hashPin: (pin: string) => Promise<PinHash>;
export declare const verifyPin: (pin: string, stored: StoredPinHash) => Promise<boolean>;
export {};
