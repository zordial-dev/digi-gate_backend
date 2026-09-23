import { Router, Response } from 'express';
import { Users, Roles } from '../models/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware: Require Super Admin (role_id = 1 or role = 'super_admin')
const requireSuperAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }
  const isSuperAdmin = req.user.role_id === 1 || req.user.role === 'super_admin';
  if (!isSuperAdmin) {
    res.status(403).json({ success: false, error: 'Access denied. Only Super Administrators can manage admin users.' });
    return;
  }
  next();
};

router.use(authenticateToken);
router.use(requireSuperAdmin);

// ============================================================
// 1. GET ALL ADMIN USERS
// ============================================================
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'email', 'role_id', 'is_active'],
      include: [{ model: Roles, as: 'role', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        role_id: u.role_id,
        role_name: u.role_id === 1 ? 'Super Admin' : 'Admin',
        is_active: u.is_active
      }))
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin users.' });
  }
});

// ============================================================
// 2. CREATE NEW ADMIN USER
// ============================================================
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, role_id } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim();
    const existing = await Users.findOne({ where: { email: cleanEmail } });
    if (existing) {
      res.status(400).json({ success: false, error: 'An admin user with this email already exists.' });
      return;
    }

    const roleId = Number(role_id) === 1 ? 1 : 2;

    const newUser = await Users.create({
      email: cleanEmail,
      password: String(password).trim(),
      role_id: roleId,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully.',
      data: {
        id: newUser.id,
        email: newUser.email,
        role_id: newUser.role_id,
        role_name: newUser.role_id === 1 ? 'Super Admin' : 'Admin',
        is_active: newUser.is_active
      }
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create admin user.' });
  }
});

// ============================================================
// 3. UPDATE ADMIN USER (TOGGLE STATUS / ROLE / PASSWORD)
// ============================================================
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const { is_active, role_id, password } = req.body;

    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Admin user not found.' });
      return;
    }

    const updates: any = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (role_id !== undefined) updates.role_id = Number(role_id) === 1 ? 1 : 2;
    if (password && String(password).trim() !== '') updates.password = String(password).trim();

    await user.update(updates);

    res.json({
      success: true,
      message: 'Admin user updated successfully.',
      data: {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_id === 1 ? 'Super Admin' : 'Admin',
        is_active: user.is_active
      }
    });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update admin user.' });
  }
});

// ============================================================
// 4. DELETE ADMIN USER
// ============================================================
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string, 10);

    if (req.user?.id === userId) {
      res.status(400).json({ success: false, error: 'You cannot delete your own admin account.' });
      return;
    }

    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'Admin user not found.' });
      return;
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Admin user deleted successfully.'
    });
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete admin user.' });
  }
});

export default router;
