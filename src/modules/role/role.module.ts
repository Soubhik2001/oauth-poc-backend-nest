import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { RoleRepository } from './role.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [RoleRepository],
  exports: [RoleRepository],
})
export class RoleModule {}
