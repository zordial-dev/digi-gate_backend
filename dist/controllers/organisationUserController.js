import { organisationUserService } from '../services/organisationUserService.js';
export const organisationUserController = {
    /**
     * GET /organisation/users
     * Retrieve all users for the authenticated user's organisation
     */
    async getAll(req, res) {
        try {
            const orgId = req.user?.organisation_id;
            if (!orgId) {
                res.status(401).json({ success: false, error: 'Organisation identifier not found in credentials.' });
                return;
            }
            const users = await organisationUserService.getAllUsers(orgId);
            res.json({
                success: true,
                data: users,
            });
        }
        catch (error) {
            console.error('Error fetching organisation users:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch organisation users.' });
        }
    },
    /**
     * GET /organisation/users/:id
     * Retrieve single user by ID for the authenticated user's organisation
     */
    async getById(req, res) {
        try {
            const orgId = req.user?.organisation_id;
            if (!orgId) {
                res.status(401).json({ success: false, error: 'Organisation identifier not found in credentials.' });
                return;
            }
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) {
                res.status(400).json({ success: false, error: 'Invalid user ID.' });
                return;
            }
            const user = await organisationUserService.getUserById(userId, orgId);
            if (!user) {
                res.status(404).json({ success: false, error: 'User not found in this organisation.' });
                return;
            }
            res.json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            console.error('Error fetching organisation user:', error);
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch user.' });
        }
    },
    /**
     * POST /organisation/users
     * Create a new organisation user (admin or sub_admin)
     */
    async create(req, res) {
        try {
            const orgId = req.user?.organisation_id;
            if (!orgId) {
                res.status(401).json({ success: false, error: 'Organisation identifier not found in credentials.' });
                return;
            }
            const { email, password, role } = req.body;
            const newUser = await organisationUserService.createUser(orgId, {
                email,
                password,
                role,
            });
            res.status(201).json({
                success: true,
                message: 'Organisation user created successfully.',
                data: newUser,
            });
        }
        catch (error) {
            console.error('Error creating organisation user:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to create user.' });
        }
    },
    /**
     * PUT /organisation/users/:id
     * Update organisation user (only role and is_active allowed)
     */
    async update(req, res) {
        try {
            const orgId = req.user?.organisation_id;
            const currentUserId = req.user?.id;
            if (!orgId || !currentUserId) {
                res.status(401).json({ success: false, error: 'Authentication required.' });
                return;
            }
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) {
                res.status(400).json({ success: false, error: 'Invalid user ID.' });
                return;
            }
            const { role, is_active } = req.body;
            const updatedUser = await organisationUserService.updateUser(userId, orgId, { role, is_active }, currentUserId);
            res.json({
                success: true,
                message: 'Organisation user updated successfully.',
                data: updatedUser,
            });
        }
        catch (error) {
            console.error('Error updating organisation user:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to update user.' });
        }
    },
    /**
     * DELETE /organisation/users/:id
     * Delete organisation user (blocks self and last admin)
     */
    async delete(req, res) {
        try {
            const orgId = req.user?.organisation_id;
            const currentUserId = req.user?.id;
            if (!orgId || !currentUserId) {
                res.status(401).json({ success: false, error: 'Authentication required.' });
                return;
            }
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId)) {
                res.status(400).json({ success: false, error: 'Invalid user ID.' });
                return;
            }
            await organisationUserService.deleteUser(userId, orgId, currentUserId);
            res.json({
                success: true,
                message: 'Admin user deleted successfully.',
            });
        }
        catch (error) {
            console.error('Error deleting organisation user:', error);
            res.status(400).json({ success: false, error: error.message || 'Failed to delete user.' });
        }
    },
};
