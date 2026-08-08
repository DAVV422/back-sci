import { UserDTO } from '../../user/dto/user.dto';

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}
