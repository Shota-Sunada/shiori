import { JwtPayload } from 'jsonwebtoken';

// Request 型に user を追加
declare module 'express-serve-static-core' {
  interface Request {
    user?: string | JwtPayload;
  }
}

export {}; // モジュール化して衝突回避
