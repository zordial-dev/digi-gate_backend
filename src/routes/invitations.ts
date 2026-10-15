import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { Invitations, People, Organisations, Visitors, VisitorVisits } from '../models/index.js';

const router = Router();

// Character set excluding easily confused characters: 0, O, 1, I
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCode(): string {
  let result = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `INV-${result}`;
}

async function getUniqueInvitationCode(): Promise<string> {
  let code = '';
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateRandomCode();
    const found = await Invitations.findOne({ where: { invitation_code: code } });
    if (!found) exists = false;
    attempts++;
  }
  return code;
}

// ============================================================
// POST /api/invitations - Create a new invitation (Host or Admin)
// ============================================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organisation_id,
      host_id,
      visitor_name,
      mobile_number,
      purpose_of_visit,
      valid_date,
      validity_duration,
      additional_notes,
    } = req.body;

    if (!visitor_name || !String(visitor_name).trim()) {
      return res.status(400).json({ success: false, error: 'Visitor name is required.' });
    }

    const cleanMobile = String(mobile_number || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
      });
    }

    if (!purpose_of_visit || !String(purpose_of_visit).trim()) {
      return res.status(400).json({ success: false, error: 'Purpose of visit is required.' });
    }

    const hostIdNum = parseInt(String(host_id), 10);
    if (!hostIdNum) {
      return res.status(400).json({ success: false, error: 'Host is required.' });
    }

    const orgIdNum = parseInt(String(organisation_id), 10);
    if (!orgIdNum) {
      return res.status(400).json({ success: false, error: 'Organisation is required.' });
    }

    // Verify host exists
    const host = await People.findByPk(hostIdNum);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Specified host not found.' });
    }

    // Determine valid_date
    const targetDateStr = valid_date ? String(valid_date).slice(0, 10) : new Date().toISOString().slice(0, 10);

    // Compute valid_until timestamp
    let validUntilDate = new Date(`${targetDateStr}T23:59:59`);
    if (isNaN(validUntilDate.getTime())) {
      validUntilDate = new Date();
      validUntilDate.setHours(23, 59, 59, 999);
    }

    if (validity_duration === '24h') {
      validUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (validity_duration === '48h') {
      validUntilDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else if (validity_duration === '3d') {
      validUntilDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (validity_duration === '7d') {
      validUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const invitationCode = await getUniqueInvitationCode();

    const invitation = await Invitations.create({
      invitation_code: invitationCode,
      organisation_id: orgIdNum,
      host_id: hostIdNum,
      visitor_name: String(visitor_name).trim(),
      mobile_number: cleanMobile,
      purpose_of_visit: String(purpose_of_visit).trim(),
      valid_date: targetDateStr,
      valid_until: validUntilDate,
      additional_notes: additional_notes ? String(additional_notes).trim() : null,
      status: 'active',
    });

    const fullInvitation = await Invitations.findByPk(invitation.id, {
      include: [
        { model: People, as: 'host', attributes: ['id', 'full_name', 'department', 'designation', 'email', 'profile_pic'] },
        { model: Organisations, as: 'organisation', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: fullInvitation,
    });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create invitation.' });
  }
});

// ============================================================
// GET /api/invitations - List invitations (filter by org/host)
// ============================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organisation_id, host_id, status, search } = req.query;

    const where: any = {};
    if (organisation_id) {
      where.organisation_id = parseInt(String(organisation_id), 10);
    }
    if (host_id) {
      where.host_id = parseInt(String(host_id), 10);
    }
    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { invitation_code: { [Op.iLike]: q } },
        { visitor_name: { [Op.iLike]: q } },
        { mobile_number: { [Op.like]: q } },
        { purpose_of_visit: { [Op.iLike]: q } },
      ];
    }

    // Auto-expire any active invitations whose valid_until is past
    await Invitations.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          valid_until: { [Op.lt]: new Date() }
        }
      }
    );

    const list = await Invitations.findAll({
      where,
      include: [
        { model: People, as: 'host', attributes: ['id', 'full_name', 'department', 'designation', 'profile_pic'] },
        { model: Organisations, as: 'organisation', attributes: ['id', 'name'] },
        { model: VisitorVisits, as: 'visit', attributes: ['id', 'check_in_time', 'selfie_url'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('Error listing invitations:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch invitations.' });
  }
});

// ============================================================
// GET /api/invitations/check-mobile/:mobile - Check for ACTIVE invitation
// ============================================================
router.get('/check-mobile/:mobile', async (req: Request, res: Response) => {
  try {
    const cleanMobile = String(req.params.mobile || '').replace(/\D/g, '');
    const { organisation_id } = req.query;

    if (cleanMobile.length !== 10) {
      return res.json({ success: true, hasActiveInvitation: false });
    }

    const where: any = {
      mobile_number: cleanMobile,
      status: 'active',
      valid_until: { [Op.gte]: new Date() }
    };

    if (organisation_id) {
      where.organisation_id = parseInt(String(organisation_id), 10);
    }

    const activeInvitation = await Invitations.findOne({
      where,
      include: [
        { model: People, as: 'host', attributes: ['id', 'full_name', 'department'] }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!activeInvitation) {
      return res.json({
        success: true,
        hasActiveInvitation: false
      });
    }

    // Return active status with hint for UI
    res.json({
      success: true,
      hasActiveInvitation: true,
      count: 1,
      invitationHint: `${activeInvitation.invitation_code.slice(0, 4)}***`,
      hostName: (activeInvitation as any).host?.full_name || null
    });
  } catch (error: any) {
    console.error('Error checking active invitation for mobile:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to check active invitation.' });
  }
});

// ============================================================
// POST /api/invitations/validate-code - Validate code against mobile
// ============================================================
router.post('/validate-code', async (req: Request, res: Response) => {
  try {
    const { mobile_number, invitation_code, organisation_id } = req.body;

    if (!invitation_code || !String(invitation_code).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the Invitation Code.'
      });
    }

    const cleanCode = String(invitation_code).trim().toUpperCase();
    const cleanMobile = String(mobile_number || '').replace(/\D/g, '');

    const invitation = await Invitations.findOne({
      where: {
        invitation_code: cleanCode
      },
      include: [
        { model: People, as: 'host', attributes: ['id', 'full_name', 'department', 'designation', 'profile_pic', 'available_from', 'available_to', 'working_days', 'unavailable_dates', 'date_overrides', 'lunch_from', 'lunch_to'] },
        { model: Organisations, as: 'organisation', attributes: ['id', 'name'] }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invitation code. Please verify the code from your host.'
      });
    }

    // 1. Mobile number check
    if (cleanMobile && invitation.mobile_number !== cleanMobile) {
      return res.status(400).json({
        success: false,
        error: `This invitation code is not linked to mobile number +91 ${cleanMobile}.`
      });
    }

    // 2. Organisation check (if specified)
    if (organisation_id && invitation.organisation_id !== parseInt(String(organisation_id), 10)) {
      return res.status(400).json({
        success: false,
        error: 'This invitation code is for a different organisation.'
      });
    }

    // 3. Status check
    if (invitation.status === 'used') {
      const usedTime = invitation.used_at ? new Date(invitation.used_at).toLocaleDateString() : '';
      return res.status(400).json({
        success: false,
        error: `This invitation code has already been used${usedTime ? ` on ${usedTime}` : ''}.`
      });
    }

    if (invitation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'This invitation has been cancelled by the host.'
      });
    }

    // 4. Expiration check
    const now = new Date();
    if (new Date(invitation.valid_until) < now) {
      await invitation.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        error: 'This invitation code has expired. Please contact your host for a new invitation.'
      });
    }

    // 5. Find or ensure visitor record
    let visitor = await Visitors.findOne({
      where: {
        mobile_number: invitation.mobile_number,
        organisation_id: invitation.organisation_id
      }
    });

    if (!visitor) {
      visitor = await Visitors.create({
        organisation_id: invitation.organisation_id,
        full_name: invitation.visitor_name,
        mobile_number: invitation.mobile_number,
        designation: 'Invited Guest',
        company: 'Guest'
      });
    }

    const host = (invitation as any).host;

    res.json({
      success: true,
      message: 'Invitation validated successfully',
      data: {
        id: invitation.id,
        invitation_code: invitation.invitation_code,
        visitor_name: invitation.visitor_name,
        mobile_number: invitation.mobile_number,
        purpose_of_visit: invitation.purpose_of_visit,
        host_id: invitation.host_id,
        host_name: host?.full_name || 'Host',
        host_department: host?.department || '',
        host_designation: host?.designation || '',
        host_profile_pic: host?.profile_pic || null,
        additional_notes: invitation.additional_notes || '',
        valid_date: invitation.valid_date,
        valid_until: invitation.valid_until,
        organisation_id: invitation.organisation_id,
        visitor_id: visitor?.id || null,
      }
    });
  } catch (error: any) {
    console.error('Error validating invitation code:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to validate invitation code.' });
  }
});

// ============================================================
// PATCH /api/invitations/:id/cancel - Cancel an invitation
// ============================================================
router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const invitation = await Invitations.findByPk(id);
    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found.' });
    }
    if (invitation.status === 'used') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an invitation that has already been used.' });
    }
    await invitation.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Invitation cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
