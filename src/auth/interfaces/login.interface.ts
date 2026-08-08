import { UserDTO } from '../../user/dto/user.dto';

export interface ILoginResponse {
  accessToken: string;
  user: UserDTO;
}
