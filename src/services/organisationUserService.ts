import { Op } from 'sequelize';
import { OrganisationUsers } from '../models/index.js';

export interface CreateOrgUserData {
  email: string;
  password: string;
  role: 'admin' | 'sub_admin';
}

export interface UpdateOrgUserData {
  role?: 'admin' | 'sub_admin';
  is_active?: boolean;
}

export const organisationUserService = {
  /**
   * Get all users for a given organisation (password omitted)
   */
  async getAllUsers(organisationId: number) {
    return await OrganisationUsers.findAll({
      where: { organisation_id: organisationId },
      attributes: ['id', 'organisation_id', 'email', 'role', 'is_active'],
      order: [['id', 'ASC']],
    });
  },

  /**
   * Get a specific user by ID scoped to organisation (password omitted)
   */
  async getUserById(id: number, organisationId: number) {
    return await OrganisationUsers.findOne({
      where: { id, organisation_id: organisationId },
      attributes: ['id', 'organisation_id', 'email', 'role', 'is_active'],
    });
  },

  /**
   * Create a new organisation user
   */
  async createUser(organisationId: number, data: CreateOrgUserData) {
    const { email, password, role } = data;

    if (!email || !String(email).trim()) {
      throw new Error('Email is required.');
    }
    if (!password || !String(password).trim()) {
      throw new Error('Password is required.');
    }
    // Only sub_admin is allowed to be created — there is only one Super Admin per organisation
    if (role && role !== 'sub_admin') {
      throw new Error('Only Sub Admin accounts can be created. There is only one Super Admin per organisation.');
    }
    const targetRole = 'sub_admin';

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check duplicate email (globally unique across organisation_users)
    const existing = await OrganisationUsers.findOne({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new Error('An organisation user with this email already exists.');
    }

    // Store plain password in database (not encrypted)
    const newUser = await OrganisationUsers.create({
      organisation_id: organisationId,
      email: cleanEmail,
      password: cleanPassword,
      role: targetRole,
      is_active: true,
    });

    return {
      id: newUser.id,
      organisation_id: newUser.organisation_id,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
    };
  },

  /**
   * Update organisation user (only role and is_active allowed, never move org)
   */
  async updateUser(
    id: number,
    organisationId: number,
    data: UpdateOrgUserData,
    currentUserId: number
  ) {
    const user = await OrganisationUsers.findOne({
      where: { id, organisation_id: organisationId },
    });

    if (!user) {
      throw new Error('User not found in this organisation.');
    }

    const updates: Partial<{ role: 'admin' | 'sub_admin'; is_active: boolean }> = {};

    // 1. Role update validation: Super admin is unique and cannot be reassigned or granted
    if (data.role !== undefined) {
      if (data.role !== 'sub_admin') {
        throw new Error('Only Sub Admin accounts can be managed. Super Admin role cannot be assigned.');
      }
      if (user.role === 'super_admin' || user.role === 'admin') {
        throw new Error('The primary Super Admin account role cannot be modified.');
      }
      updates.role = 'sub_admin';
    }

    // 2. is_active update validation
    if (data.is_active !== undefined) {
      const targetIsActive = Boolean(data.is_active);

      if (!targetIsActive && user.is_active) {
        if (user.id === currentUserId) {
          throw new Error('You cannot deactivate your own account.');
        }

        const isTargetAdmin = user.role === 'admin' || user.role === 'super_admin';
        if (isTargetAdmin) {
          const activeAdminCount = await OrganisationUsers.count({
            where: {
              organisation_id: organisationId,
              role: { [Op.in]: ['admin', 'super_admin'] },
              is_active: true,
            },
          });

          if (activeAdminCount <= 1) {
            throw new Error('Cannot deactivate the last active administrator.');
          }
        }
      }

      updates.is_active = targetIsActive;
    }

    await user.update(updates);

    return {
      id: user.id,
      organisation_id: user.organisation_id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };
  },

  /**
   * Delete an organisation user
   * Blocks deleting yourself and the last remaining admin
   */
  async deleteUser(id: number, organisationId: number, currentUserId: number) {
    const user = await OrganisationUsers.findOne({
      where: { id, organisation_id: organisationId },
    });

    if (!user) {
      throw new Error('User not found in this organisation.');
    }

    // Block deleting yourself
    if (user.id === currentUserId) {
      throw new Error('You cannot delete your own account.');
    }

    // Block deleting the last remaining admin
    const isTargetAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (isTargetAdmin) {
      const adminCount = await OrganisationUsers.count({
        where: {
          organisation_id: organisationId,
          role: { [Op.in]: ['admin', 'super_admin'] },
        },
      });

      if (adminCount <= 1) {
        throw new Error('Cannot delete the last remaining administrator of this organisation.');
      }
    }

    await user.destroy();
    return { success: true };
  },
};
