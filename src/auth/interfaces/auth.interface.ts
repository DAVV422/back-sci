export interface IAuth {
    email: string;
    password: string;
  }
  
  export interface IAuthTokenResult {
    role: string;
    sub: string;
    iat: number;
    exp: number;
  }