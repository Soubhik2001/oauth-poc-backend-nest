import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  // ParseFilePipe,
  // MaxFileSizeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
// import { DebugFileValidator } from './debug-file.validator';
import { DynamicFileValidatorPipe } from '../common/pipes/dynamic-file-validator.pipe';

@Controller('api/users')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FilesInterceptor('documents', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles(DynamicFileValidatorPipe)
    files: Array<Express.Multer.File>,
  ) {
    return this.authService.register(registerDto, files);
  }
}
