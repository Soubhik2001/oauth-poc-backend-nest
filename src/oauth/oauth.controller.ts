import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { OauthService } from './oauth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import type { Response } from 'express';
import { User, Role } from '@prisma/client';

type RequestWithUser = {
  user: User & { role: Role };
};

class AuthorizeDto {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  email: string;
  password: string;
}

class TokenDto {
  grant_type: string;
  code?: string;
  client_id: string;
  client_secret: string;
  redirect_uri?: string;
}

@Controller('oauth')
export class OauthController {
  constructor(private oauthService: OauthService) {}

  @Post('authorize')
  @UseGuards(LocalAuthGuard)
  authorize(
    @Request() req: RequestWithUser,
    @Body() body: AuthorizeDto,
    @Res() res: Response,
  ) {
    const { client_id, redirect_uri } = body;

    const authorizationCode = this.oauthService.grantAuthorizationCode(
      req.user,
      client_id,
      redirect_uri,
    );

    const url = new URL(redirect_uri);
    url.searchParams.set('code', authorizationCode);
    res.redirect(url.toString());
  }

  @Post('token')
  async token(@Body() body: TokenDto, @Res() res: Response) {
    const { grant_type, code, client_id, client_secret, redirect_uri } = body;

    if (grant_type === 'authorization_code') {
      if (!code) {
        throw new BadRequestException('Missing authorization code.');
      }

      const tokenResponse = await this.oauthService.exchangeCodeForToken(
        code,
        client_id,
        client_secret,
        redirect_uri,
      );
      return res.json(tokenResponse);
    }

    throw new BadRequestException('Unsupported grant type.');
  }
}
