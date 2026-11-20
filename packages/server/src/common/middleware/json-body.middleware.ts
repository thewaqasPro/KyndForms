import { Injectable, NestMiddleware } from '@nestjs/common'
import * as bodyParser from 'body-parser'
import { Request, Response } from 'express'

@Injectable()
export class JsonBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => any) {
    bodyParser.json({
      limit: '1mb'
    })(req, res, () => {
      // Compatibility shim: Normalize legacy ThirdPartyInput GraphQL variable types to IntegrationInput
      if (
        req.body &&
        typeof req.body.query === 'string' &&
        req.body.query.includes('ThirdPartyInput!')
      ) {
        req.body.query = req.body.query.replace(/ThirdPartyInput!/g, 'IntegrationInput!')
      }
      next()
    })
  }
}
