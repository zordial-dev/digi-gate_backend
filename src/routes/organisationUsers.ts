import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { organisationUserController } from '../controllers/organisationUserController.js';

const router = Router();

/**
 * Middleware: Require Organisation Administrator
 * Only role === 'admin' (or 'super_admin' from initial seed) can access these APIs.
 * Explicitly rejects sub_admin or users without an organisation_id.
 */
const requireOrgAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.organisation_id) {
    res.status(401).json({
      success: false,
      error: 'Authentication required with valid organisation.',
    });
    return;
  }

  // Look up org_user_role or role
  const userRole = (req.user as any).org_user_role || req.user.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (!isAdmin) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Only organisation administrators can access this resource.',
    });
    return;
  }

  next();
};

router.use(authenticateToken);
router.use(requireOrgAdmin);

// Endpoints
router.get('/', organisationUserController.getAll);
router.get('/:id', organisationUserController.getById);
router.post('/', organisationUserController.create);
router.put('/:id', organisationUserController.update);
router.delete('/:id', (_req: AuthRequest, res: Response): void => {
  res.status(400).json({ success: false, error: 'Deleting admin users is not allowed.' });
});

export default router;
