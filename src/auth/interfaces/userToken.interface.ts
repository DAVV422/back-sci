export interface IUserToken {
  role: string;
  sub: string;
  time: number;
  isExpired: boolean;
}
