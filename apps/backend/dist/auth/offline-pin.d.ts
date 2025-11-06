export type PinHash = {
    hash: string;
    salt: string;
    params: string;
};
export declare class PinPolicyError extends Error {
    readonly code = "PIN_POLICY_VIOLATION";
    constructor(message: string);
}
export declare const validatePin: (pin: string) => void;
export declare const hashPin: (pin: string) => Promise<PinHash>;
export declare const verifyPin: (pin: string, stored: PinHash) => Promise<boolean>;
