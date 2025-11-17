import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  // ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TasksService } from '../tasks/tasks.service';
import * as crypto from 'crypto';

import { User, Role } from '@prisma/client';

type AuthUser = User & { role: Role };

interface AuthCodeData {
  userId: number;
  email: string;
  roleName: string;
  clientId: string;
  redirectUri: string;
  expiresAt: number;
}

const MOCK_CLIENT = {
  clientId: 'my-client-id',
  clientSecret: 'my-client-secret',
};

@Injectable()
export class OauthService {
  private authCodes = new Map<string, AuthCodeData>();

  constructor(
    private tasksService: TasksService,
    private jwtService: JwtService,
  ) {}

  grantAuthorizationCode(
    user: AuthUser,
    clientId: string,
    redirectUri: string,
  ): string {
    if (clientId !== MOCK_CLIENT.clientId) {
      throw new BadRequestException('Invalid client_id');
    }

    const code = crypto.randomBytes(20).toString('hex');
    const codeData: AuthCodeData = {
      userId: user.id,
      email: user.email,
      roleName: user.role.name,
      clientId: clientId,
      redirectUri: redirectUri,
      expiresAt: Date.now() + 1000 * 60 * 5,
    };

    this.authCodes.set(code, codeData);
    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string,
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    if (
      clientId !== MOCK_CLIENT.clientId ||
      clientSecret !== MOCK_CLIENT.clientSecret
    ) {
      throw new UnauthorizedException('Invalid client credentials.');
    }

    const codeData = this.authCodes.get(code);
    if (!codeData) {
      throw new BadRequestException('Invalid authorization code.');
    }

    this.authCodes.delete(code);

    if (Date.now() > codeData.expiresAt) {
      throw new BadRequestException('Authorization code expired.');
    }

    if (codeData.redirectUri !== redirectUri) {
      throw new BadRequestException('redirect_uri mismatch.');
    }

    const payload = {
      sub: codeData.userId,
      email: codeData.email,
      roleName: codeData.roleName,
    };

    const expiresIn = 3600;
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }
}
