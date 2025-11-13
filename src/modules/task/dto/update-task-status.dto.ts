import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsInt()
  @IsNotEmpty()
  taskId: number;

  @IsString()
  @IsNotEmpty()
  status: string;
}
