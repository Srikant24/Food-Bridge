import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import '../models/Organization';
import { User, IUser, UserRole } from '../models/User';
import { normalizeRole, isRoleAllowed } from '../utils/roleUtils';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawHeader = req.headers.authorization || req.header('Authorization') || req.header('authorization');
    if (!rawHeader || typeof rawHeader !== 'string') {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication token required' });
      return;
    }

    const trimmedHeader = rawHeader.trim();
    // Allow case-insensitive Bearer scheme (RFC 6750)
    const match = trimmedHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication token required' });
      return;
    }

    const token = match[1].trim();
    if (!token || token === 'undefined' || token === 'null') {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication token required' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';

    let decoded: { userId: string; role?: string };
    try {
      decoded = jwt.verify(token, secret) as { userId: string; role?: string };
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication token expired. Please sign in again.' });
        return;
      }
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token' });
      return;
    }

    if (!decoded.userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid authentication token payload' });
      return;
    }

    const user = await User.findById(decoded.userId).populate('organizationId').exec();

    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User account not found or session invalid' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Unauthorized', message: 'User account is inactive' });
      return;
    }

    // Auto-normalize legacy aliases in database record if detected
    const canonicalRole = normalizeRole(user.role);
    if (user.role !== canonicalRole) {
      user.role = canonicalRole;
      user.save().catch(saveErr => console.warn('Role auto-migration notice:', saveErr));
    }

    // Enforce session role claim integrity: If token role claim differs from authoritative DB role, require re-authentication
    if (decoded.role && normalizeRole(decoded.role) !== canonicalRole) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication session role claim is outdated. Please sign in again.' 
      });
      return;
    }

    req.user = user;
    req.user.role = canonicalRole;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token' });
  }
};

export const requireRole = (allowedRoles: (UserRole | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Authoritative role check against normalized canonical roles
    const userRole = normalizeRole(req.user.role);
    const isAllowed = isRoleAllowed(userRole, allowedRoles as string[]);

    if (!isAllowed) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Optional JWT authentication middleware: Populates req.user if a valid token is present,
 * but allows unauthenticated requests to proceed with req.user undefined.
 */
export const authenticateOptionalJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawHeader = req.headers.authorization || req.header('Authorization') || req.header('authorization');
    if (!rawHeader || typeof rawHeader !== 'string') {
      return next();
    }

    const trimmedHeader = rawHeader.trim();
    const match = trimmedHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return next();
    }

    const token = match[1].trim();
    if (!token || token === 'undefined' || token === 'null') {
      return next();
    }

    const secret = process.env.JWT_SECRET || 'foodbridge_super_secret_jwt_key_hackathon_2025_dev_mode';
    let decoded: { userId: string; role?: string };
    try {
      decoded = jwt.verify(token, secret) as { userId: string; role?: string };
    } catch {
      return next();
    }

    if (!decoded.userId) {
      return next();
    }

    const user = await User.findById(decoded.userId).populate('organizationId').exec();
    if (user && user.isActive) {
      const canonicalRole = normalizeRole(user.role);
      if (user.role !== canonicalRole) {
        user.role = canonicalRole;
        user.save().catch(saveErr => console.warn('Role auto-migration notice:', saveErr));
      }
      req.user = user;
      req.user.role = canonicalRole;
    }
    next();
  } catch {
    next();
  }
};

