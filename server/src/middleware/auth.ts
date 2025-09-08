import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}
import { logger } from '../logger';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('ENTER THE JWT_SECRET in .env');
  process.exit(999);
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn('JWT検証失敗', err as Error);
      return res.sendStatus(403);
    }
    if (typeof decoded === 'string') {
      req.user = decoded; // 文字列トークンペイロード
    } else {
      req.user = decoded as JwtPayload; // オブジェクトペイロード
    }
    next();
  });
};

export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.is_admin) {
    return res.status(403).json({ message: '管理者権限が必要です。' });
  }
  next();
};
