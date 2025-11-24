import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DynamicFileValidatorPipe implements PipeTransform {
  constructor(private readonly prisma: PrismaService) {}

  async transform(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      // If file is optional, just return. If required, throw error.
      return files;
    }

    // 1. Static Validation: File Type
    // We do this first to save a DB call if the type is wrong.
    const allowedMimeTypes =
      /(image\/jpeg|image\/jpg|image\/png|application\/pdf)$/i;

    for (const file of files) {
      if (!file.mimetype.match(allowedMimeTypes)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not supported`,
        );
      }
    }

    // 2. Dynamic Validation: Fetch Max Size from DB
    // Default to 2MB (2097152 bytes) if DB setting is missing
    const defaultSize = 2 * 1024 * 1024;
    let maxSize = defaultSize;

    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'MAX_FILE_SIZE' },
      });

      if (setting?.value) {
        maxSize = parseInt(setting.value, 10);
      }
    } catch (error) {
      console.warn('Failed to fetch file size setting, using default.', error);
    }

    // 3. Check Size
    for (const file of files) {
      if (file.size > maxSize) {
        const sizeInMb = (maxSize / (1024 * 1024)).toFixed(2);
        throw new BadRequestException(
          `File ${file.originalname} is too large. Max limit is ${sizeInMb}MB.`,
        );
      }
    }

    return files;
  }
}
