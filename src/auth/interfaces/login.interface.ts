import { UserEntity } from "../../user/entities/user.entity";

export interface ILoginResponse {
    accessToken: string;
    user: UserEntity;
  }
  