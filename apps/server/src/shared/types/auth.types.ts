export interface AuthTokenPayload {
    userId: string;
    isGuestSandbox: boolean;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthTokenPayload;
        }
    }
}