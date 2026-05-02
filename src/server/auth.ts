import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const SESSION_TOKEN = uuidv4();

export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token || token !== SESSION_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function generateToken(): string {
  return SESSION_TOKEN;
}
