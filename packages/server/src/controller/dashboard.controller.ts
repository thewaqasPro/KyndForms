import { Controller, Get, Header, Redirect, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'

import { COOKIE_INVITATION_NAME } from '@config'
import {
  APP_DISABLE_REGISTRATION,
  APP_HOMEPAGE_URL,
  COOKIE_DOMAIN,
  DISABLE_LOGIN_WITH_APPLE,
  DISABLE_LOGIN_WITH_GOOGLE,
  ENABLE_GOOGLE_FONTS,
  GOOGLE_RECAPTCHA_KEY,
  STRIPE_PUBLISHABLE_KEY,
  VERIFY_EMAIL_RESEND_COOLDOWN,
  VERIFY_USER_EMAIL
} from '@environments'
import { hs } from '@kyndform/utils'
import { TRUSTED_UPLOAD_ORIGINS } from '@utils'

@Controller()
export class DashboardController {
  private runtimeConfig() {
    return {
      homepageURL: APP_HOMEPAGE_URL,
      websiteURL: APP_HOMEPAGE_URL,
      appDisableRegistration: APP_DISABLE_REGISTRATION,
      cookieDomain: COOKIE_DOMAIN,
      disableLoginWithGoogle: DISABLE_LOGIN_WITH_GOOGLE,
      disableLoginWithApple: DISABLE_LOGIN_WITH_APPLE,
      enableGoogleFonts: ENABLE_GOOGLE_FONTS,
      stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
      googleRecaptchaKey: GOOGLE_RECAPTCHA_KEY,
      uploadOrigins: TRUSTED_UPLOAD_ORIGINS,
      verifyEmailResendCooldownSeconds: Math.ceil(hs(VERIFY_EMAIL_RESEND_COOLDOWN) / 1000),
      verifyUserEmail: VERIFY_USER_EMAIL
    }
  }

  @Get('/api/config')
  config() {
    return this.runtimeConfig()
  }

  @Get('/favicon.ico')
  @Redirect('/static/favicon.ico', 302)
  favicon() {}

  @Get('/embed.js')
  @Redirect('/static/embed.js', 302)
  embedJs() {}

  @Get('/sign-up')
  signUp(@Req() req: Request, @Res() res: Response) {
    if (APP_DISABLE_REGISTRATION && !req.cookies?.[COOKIE_INVITATION_NAME]) {
      return res.redirect(302, '/login')
    }

    return this.index(res)
  }

  @Get([
    '/',
    '/dashboard',
    '/dashboard/*',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/oauth/authorize',
    '/workspace/create',
    '/workspace',
    '/workspace/*'
  ])
  @Header('X-Frame-Options', 'SAMEORIGIN')
  index(@Res() res: Response) {
    return res.render('index', {
      title: 'KyndForm Dashboard - Create and Manage Custom Forms Effortlessly',
      description:
        "Simplify your form creation process with KyndForm's intuitive dashboard. Design, customize, and manage forms all in one place, with no coding required.",
      kyndform: this.runtimeConfig()
    })
  }
}
