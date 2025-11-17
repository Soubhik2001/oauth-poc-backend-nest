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

// Define a type for our request user (from LocalAuthGuard)
type RequestWithUser = {
  user: User & { role: Role };
};

// DTO for /authorize endpoint
class AuthorizeDto {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  email: string;
  password: string;
}

// DTO for /token endpoint
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
  @UseGuards(LocalAuthGuard) // This validates email/password
  async authorize(
    @Request() req: RequestWithUser, // 'user' is attached by LocalAuthGuard
    @Body() body: AuthorizeDto,
    @Res() res: Response,
  ) {
    const { client_id, redirect_uri } = body;

    // --- FIX: Pass 'redirect_uri' to the service ---
    const authorizationCode = await this.oauthService.grantAuthorizationCode(
      req.user,
      client_id,
      redirect_uri, // This argument was missing
    );
    // --- FIX END ---

    // Redirect with the code
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

      // --- FIX: Pass 'redirect_uri' to the service for validation ---
      const tokenResponse = await this.oauthService.exchangeCodeForToken(
        code,
        client_id,
        client_secret,
        redirect_uri, // This argument was missing
      );
      // --- FIX END ---

      return res.json(tokenResponse);
    }

    throw new BadRequestException('Unsupported grant type.');
  }
}
