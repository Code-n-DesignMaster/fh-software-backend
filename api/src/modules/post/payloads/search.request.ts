import { SearchRequest } from 'src/kernel';
import { ApiProperty } from '@nestjs/swagger';

export class AdminSearch extends SearchRequest {
  @ApiProperty()
  status?: string;

  @ApiProperty()
  type = 'post';
}

export class UserSearch extends SearchRequest {
  @ApiProperty()
  type = 'post';
}
