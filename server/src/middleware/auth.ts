import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '../logger';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('ENTER THE JWT_SECRET in .env');
  process.exit(999);
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.error('JWT verification error:', err);
      return res.sendStatus(403); // Forbidden
    }
    req.user = user;
    next();
  });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !(req.user as JwtPayload).is_admin) {
    return res.status(403).json({ message: '管理者権限が必要です。' });
  }
  next();
};
