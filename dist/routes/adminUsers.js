import { Router } from 'express';
import { Users, Roles } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
// Middleware: Require Super Admin (role_id = 1 or role = 'super_admin')
const requireSuperAdmin = (req, res, next) => {
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
router.get('/', async (_req, res) => {
    try {
        const users = await Users.findAll({
            attributes: ['id', 'email', 'role_id', 'is_active', 'is_approved', 'is_blocked'],
            include: [{ model: Roles, as: 'role', attributes: ['id', 'name'] }],
            order: [['id', 'ASC']]
        });
        res.json({
            success: true,
            data: users.map((u) => ({
                id: u.id,
                email: u.email,
                role_id: u.role_id,
                role_name: u.role_id === 1 ? 'Super Admin' : 'Admin',
                is_active: u.is_active,
                is_approved: u.is_approved ?? 0,
                is_blocked: u.is_blocked ?? false
            }))
        });
    }
    catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin users.' });
    }
});
// ============================================================
// 2. CREATE NEW ADMIN USER
// ============================================================
router.post('/', async (req, res) => {
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
            is_active: true,
            is_approved: 1, // Super admin created users are auto-approved
            is_blocked: false
        });
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully.',
            data: {
                id: newUser.id,
                email: newUser.email,
                role_id: newUser.role_id,
                role_name: newUser.role_id === 1 ? 'Super Admin' : 'Admin',
                is_active: newUser.is_active,
                is_approved: newUser.is_approved,
                is_blocked: newUser.is_blocked
            }
        });
    }
    catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to create admin user.' });
    }
});
// ============================================================
// 3. UPDATE ADMIN USER (TOGGLE APPROVAL / BLOCK / STATUS / ROLE / PASSWORD)
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { is_approved, is_blocked, is_active, role_id, password } = req.body;
        const user = await Users.findByPk(userId);
        if (!user) {
            res.status(404).json({ success: false, error: 'Admin user not found.' });
            return;
        }
        const updates = {};
        // Validate approval state transitions:
        // Rule: We can approve (1) or deny (2), can approve denied request (2 -> 1), BUT CANNOT deny an approved request (1 -> 2).
        if (is_approved !== undefined) {
            const newApprovedState = Number(is_approved);
            if (user.is_approved === 1 && newApprovedState === 2) {
                res.status(400).json({
                    success: false,
                    error: 'An approved admin request cannot be denied. You can block/unblock approved admins instead.'
                });
                return;
            }
            updates.is_approved = newApprovedState;
        }
        if (typeof is_blocked === 'boolean')
            updates.is_blocked = is_blocked;
        if (typeof is_active === 'boolean')
            updates.is_active = is_active;
        if (role_id !== undefined)
            updates.role_id = Number(role_id) === 1 ? 1 : 2;
        if (password && String(password).trim() !== '')
            updates.password = String(password).trim();
        await user.update(updates);
        res.json({
            success: true,
            message: 'Admin user updated successfully.',
            data: {
                id: user.id,
                email: user.email,
                role_id: user.role_id,
                role_name: user.role_id === 1 ? 'Super Admin' : 'Admin',
                is_active: user.is_active,
                is_approved: user.is_approved,
                is_blocked: user.is_blocked
            }
        });
    }
    catch (error) {
        console.error('Error updating admin user:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to update admin user.' });
    }
});
// ============================================================
// 4. DELETE ADMIN USER (DISALLOWED)
// ============================================================
router.delete('/:id', async (_req, res) => {
    res.status(400).json({ success: false, error: 'Deleting admin requests is not allowed.' });
});
export default router;
