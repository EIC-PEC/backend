import { Injectable, NestMiddleware, UnsupportedMediaTypeException } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH'])

@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (MUTATING_METHODS.has(req.method)) {
      const contentLength = req.headers['content-length']
      const hasPayload =
        (contentLength && parseInt(contentLength, 10) > 0) ||
        req.headers['transfer-encoding'] !== undefined ||
        (req.body && Object.keys(req.body).length > 0)

      if (hasPayload) {
        const contentType = req.headers['content-type']
        const isMultipart = contentType?.startsWith('multipart/form-data')
        const isJson = contentType?.startsWith('application/json')
        const isUrlEncoded = contentType?.startsWith('application/x-www-form-urlencoded')

        if (!isJson && !isMultipart && !isUrlEncoded) {
          throw new UnsupportedMediaTypeException(
            'Mutating requests with a payload must specify a valid Content-Type (application/json or multipart/form-data).'
          )
        }
      }
    }
    next()
  }
}
