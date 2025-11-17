import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TasksService } from '../tasks/tasks.service';
import { RoleEnum } from '../common/constants/roles.enum';
import { User, Role } from '@prisma/client';
import * as crypto from 'crypto';

// Define the shape of the user object we get from LocalStrategy
type AuthUser = User & { role: Role };

// Store for temporary auth codes
interface AuthCodeData {
  userId: number;
  email: string;
  roleName: string;
  clientId: string;
  redirectUri: string;
  expiresAt: number;
}

// Mock client database
const MOCK_CLIENT = {
  clientId: 'my-client-id',
  clientSecret: 'my-client-secret',
};

@Injectable()
export class OauthService {
  // Store codes in memory for this PoC. In production, use Redis or a database.
  private authCodes = new Map<string, AuthCodeData>();

  constructor(
    private tasksService: TasksService,
    private jwtService: JwtService,
  ) {}

  /**
   * 1. Grant Authorization Code
   */
  async grantAuthorizationCode(
    user: AuthUser,
    clientId: string,
    redirectUri: string,
  ): Promise<string> {
    // Validate Client
    if (clientId !== MOCK_CLIENT.clientId) {
      throw new BadRequestException('Invalid client_id');
    }

    // --- The Approval Check ---
    // --- FIX 2: Explicitly cast enum to string for safe comparison ---
    if (user.role.name !== String(RoleEnum.GENERAL_PUBLIC)) {
      // --- FIX END ---
      const taskStatus = await this.tasksService.getTaskStatus(user.id);

      if (taskStatus !== 'approved') {
        throw new ForbiddenException(
          `Access Denied: Your role '${user.role.name}' is not yet approved. Status: ${taskStatus || 'not found'}.`,
        );
      }
    }
    // --- End Approval Check ---

    // User is authenticated and authorized, create auth code
    const code = crypto.randomBytes(20).toString('hex');
    const codeData: AuthCodeData = {
      userId: user.id,
      email: user.email,
      roleName: user.role.name,
      clientId: clientId,
      redirectUri: redirectUri,
      expiresAt: Date.now() + 1000 * 60 * 5, // 5-minute expiry
    };

    this.authCodes.set(code, codeData);
    return code;
  }

  /**
   * 2. Exchange Authorization Code for an Access Token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string,
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    // Validate Client
    if (
      clientId !== MOCK_CLIENT.clientId ||
      clientSecret !== MOCK_CLIENT.clientSecret
    ) {
      throw new UnauthorizedException('Invalid client credentials.');
    }

    // Retrieve and validate code
    const codeData = this.authCodes.get(code);
    if (!codeData) {
      throw new BadRequestException('Invalid authorization code.');
    }

    // Delete code so it can't be reused
    this.authCodes.delete(code);

    if (Date.now() > codeData.expiresAt) {
      throw new BadRequestException('Authorization code expired.');
    }

    if (codeData.redirectUri !== redirectUri) {
      throw new BadRequestException('redirect_uri mismatch.');
    }

    // All checks passed, issue JWT (Access Token)
    const payload = {
      sub: codeData.userId,
      email: codeData.email,
      roleName: codeData.roleName,
    };

    const expiresIn = 3600; // 1 hour

    // --- FIX 1: Use 'signAsync' to make the function truly async ---
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });
    // --- FIX END ---

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }
}
