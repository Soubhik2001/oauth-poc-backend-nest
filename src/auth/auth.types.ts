// This file is at src/auth/auth.types.ts

// --- FIX: Changed 'import' to 'import type' ---
import type { Request } from 'express';
// --- FIX END ---
import { AuthUser } from './auth.service';

export interface RequestWithUser extends Request {
  user: AuthUser;
}
