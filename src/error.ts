/** API Errors. */

import * as Koa from 'koa'

import {camelToSnake} from './utils'

enum ErrorCode {
    BadRequest,
    FileMissing,
    InternalError,
    InvalidImage,
    InvalidMethod,
    InvalidProxyUrl,
    InvalidSignature,
    LengthRequired,
    MissingParam,
    NoSuchAccount,
    NotFound,
    PayloadTooLarge,
}

const HttpCodes = new Map<ErrorCode, number>([
    [ErrorCode.BadRequest, 400],
    [ErrorCode.FileMissing, 400],
    [ErrorCode.InternalError, 500],
    [ErrorCode.InvalidImage, 400],
    [ErrorCode.InvalidMethod, 405],
    [ErrorCode.InvalidProxyUrl, 400],
    [ErrorCode.InvalidSignature, 400],
    [ErrorCode.LengthRequired, 411],
    [ErrorCode.MissingParam, 400],
    [ErrorCode.NoSuchAccount, 400],
    [ErrorCode.NotFound, 404],
    [ErrorCode.PayloadTooLarge, 413],
])

interface APIErrorOptions {
    cause?: Error,
    code?: ErrorCode,
    info?: {[key: string]: string},
    message?: string,
}

export class APIError extends Error {

    public static readonly Code = ErrorCode

    public static assert(condition: any, arg?: APIErrorOptions | ErrorCode | string) {
        if (!condition) {
            let opts: APIErrorOptions = {}
            switch (typeof arg) {
                case 'string':
                    opts.info = {msg: arg as string}
                case 'object':
                    opts = arg as APIErrorOptions
                default:
                    opts = {code: arg as ErrorCode}
            }
            if (!opts.code) {
                opts.code = ErrorCode.BadRequest
            }
            throw new APIError(opts)
        }
    }

    public static assertParams(object: {[key: string]: any}, keys: string[]) {
        for (const key of keys) {
            if (!object[key]) {
                throw new APIError({code: APIError.Code.MissingParam, info: {param: key}})
            }
        }
    }

    public readonly cause?: Error
    public readonly code: ErrorCode
    public readonly info?: {[key: string]: string}

    constructor(options: APIErrorOptions) {
        const code = options.code || ErrorCode.InternalError
        super(options.message || ErrorCode[code])
        this.cause = options.cause
        this.code = code
        this.info = options.info
        this.name = 'APIError'
    }

    get statusCode() {
        return HttpCodes.get(this.code) || 500
    }

    public toJSON() {
        return {
            info: this.info,
            name: camelToSnake(ErrorCode[this.code]),
        }
    }
}

export async function errorMiddleware(ctx: Koa.Context, next: () => Promise<any>) {
    try {
        await next()
    } catch (error) {
        if (!(error instanceof APIError)) {
            error = new APIError({cause: error})
        }
        ctx.status = error.statusCode
        ctx['api_error'] = error
        ctx.body = {error}
        ctx.app.emit('error', error, ctx.app)
    }
}