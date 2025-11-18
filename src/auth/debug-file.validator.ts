import { FileValidator } from '@nestjs/common';
import type { Express } from 'express';

export class DebugFileValidator extends FileValidator {
  constructor(protected readonly validationOptions: { fileType: RegExp }) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File): boolean {
    console.log('--- [DebugFileValidator] Start ---');
    console.log(`Filename: ${file.originalname}`);
    console.log(`Mimetype received: '${file.mimetype}'`);

    const isMatch = this.validationOptions.fileType.test(file.mimetype);

    console.log(`Regex used: ${this.validationOptions.fileType}`);
    console.log(`Is Match? ${isMatch}`);
    console.log('--- [DebugFileValidator] End ---');

    return isMatch;
  }

  buildErrorMessage(file: { mimetype: string }): string {
    return `Debug Validation Failed. File type '${file.mimetype}' did not match regex ${this.validationOptions.fileType}`;
  }
}
