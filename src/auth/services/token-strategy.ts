import { IUserToken } from '../interfaces/userToken.interface';

export interface ITokenStrategy {
  validate(payload: IUserToken): Promise<IUserToken | false>;
}
