declare namespace Express {
  interface Request {
    idUser: string;
    roleUser: string;
    traceId: string;
  }
}
