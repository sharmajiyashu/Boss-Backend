export class UnauthorizedError extends Error {
    status: number;
    constructor(err: any) {
        super(err instanceof Error ? err.message : (err && err.message ? err.message : String(err)));
        this.status = 401;
        this.name = 'UnauthorizedError';
    }
}

export class ValidationError extends Error {
    status: number;
    constructor(err: any) {
        super(err instanceof Error ? err.message : (err && err.message ? err.message : String(err)));
        this.status = 400;
        this.name = 'ValidationError';
    }
}

export class ForbiddenError extends Error {
    status: number;
    constructor(err: any) {
        super(err instanceof Error ? err.message : (err && err.message ? err.message : String(err)));
        this.status = 403;
        this.name = 'ForbiddenError';
    }
}
