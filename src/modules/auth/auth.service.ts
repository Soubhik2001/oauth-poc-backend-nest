import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserRepository } from '../user/user.repository.js';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory stores for demo. Use DB for production
  private authorizationCodes = new Map<string, string>(); // code -> userId
  private accessTokens = new Map<string, string>(); // token -> userId

  constructor(private readonly userRepo: UserRepository) {}

  // Generate authorization code for accepted user
  async generateCode(userId: string): Promise<string> {
    const user = await this.userRepo.getUserByIdWithAcceptance(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isAccepted)
      throw new UnauthorizedException('User not allowed to authorize');

    const code = crypto.randomBytes(16).toString('hex');
    this.authorizationCodes.set(code, userId);
    this.logger.log(`Generated code for user ${userId}: ${code}`);
    return code;
  }

  // Exchange code for access token
  async exchangeCodeForToken(code: string): Promise<string> {
    const userId = this.authorizationCodes.get(code);
    if (!userId) throw new UnauthorizedException('Invalid authorization code');

    const token = crypto.randomBytes(32).toString('hex');
    this.accessTokens.set(token, userId);
    this.authorizationCodes.delete(code); // one-time use
    this.logger.log(`Exchanged code for token for user ${userId}`);
    return Promise.resolve(token);
  }

  // Validate token (for protected routes)
  validateToken(token: string): string {
    const userId = this.accessTokens.get(token);
    if (!userId) throw new UnauthorizedException('Invalid access token');
    return userId;
  }
}
