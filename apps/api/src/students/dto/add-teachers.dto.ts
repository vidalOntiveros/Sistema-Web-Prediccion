import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AddTeachersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  teacherIds: string[];
}
