import { IUserToken } from "../interfaces/userToken.interface";

export interface ITokenStrategy {
    validate(token: string): Promise<IUserToken | false>;
  }
  