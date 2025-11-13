import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class RoleRepository {
  private readonly logger = new Logger(RoleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRoleById(roleId: number) {
    try {
      const role = await this.prisma.client.role.findUnique({
        where: { id: roleId },
      });
      return role;
    } catch (error) {
      this.logger.error('Error fetching role by ID', error);
      throw error;
    }
  }
}
