import { Router } from 'express';
import { Organisations, People, Visitors, VisitorVisits } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { createUpload } from '../middleware/upload.js';

const router = Router();

// ============================================================
// DASHBOARD STATS
// ============================================================
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [totalOrganisations, totalVisitors, totalVisits, activeOrganisations, pendingRequests] = await Promise.all([
      Organisations.count({ where: { is_approved: 1 } }),
      Visitors.count(),
      VisitorVisits.count(),
      Organisations.count({ where: { is_active: true, is_approved: 1 } }),
      Organisations.count({ where: { is_approved: { [Op.ne]: 1 } } }),
    ]);

    res.json({
      success: true,
      data: {
        total_organisations: totalOrganisations,
        total_visitors: totalVisitors,
        total_visits: totalVisits,
        active_organisations: activeOrganisations,
        pending_requests: pendingRequests,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// RECENT ORGANISATIONS
// ============================================================
router.get('/dashboard/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '5');

    const organisations = await Organisations.findAll({
      where: { is_approved: 1 },
      order: [['id', 'DESC']],
      limit: limit,
      attributes: ['id', 'name', 'code', 'logo_url', 'city', 'is_active', 'is_approved'],
    });

    res.json({ success: true, data: organisations });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET ALL APPROVED ORGANISATIONS (with pagination & search)
// ============================================================
router.get('/organisations', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const search = req.query.search as string || '';

    const offset = (page - 1) * limit;
    const where: any = {
      is_approved: 1,
    };

    if (search) {
      where[Op.and] = [
        { is_approved: 1 },
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { city: { [Op.iLike]: `%${search}%` } },
          ],
        },
      ];
    }

    const { count, rows } = await Organisations.findAndCountAll({
      where,
      attributes: ['id', 'name', 'code', 'logo_url', 'city', 'address', 'phone', 'email', 'website', 'is_active', 'is_approved'],
      order: [['id', 'DESC']],
      limit: limit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET ORGANISATION BY ID
// ============================================================
router.get('/organisations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    res.json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET ORGANISATION HOSTS BY ID
// ============================================================
router.get('/organisations/:id/hosts', async (req, res) => {
  try {
    const organisation_id = parseInt(req.params.id as string);

    if (isNaN(organisation_id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const hosts = await People.findAll({
      where: { organisation_id },
      order: [['full_name', 'ASC']],
      attributes: ['id', 'full_name', 'email', 'mobile_number', 'designation', 'department', 'profile_pic', 'is_available'],
    });

    res.json({ success: true, data: hosts });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// CREATE ORGANISATION (with logo upload)
// ============================================================
const logoUpload = createUpload({
  folder: 'organisations',
  filename: `logo_${Date.now()}`
});

router.post('/organisations', logoUpload.single('logo'), async (req, res) => {
  try {
    const data = req.body;
    const file = (req as any).file;

    if (file) {
      data.logo_url = `/public/organisations/${file.filename}`;
    }

    const organisation = await Organisations.create(data);

    res.status(201).json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// UPDATE ORGANISATION (with logo upload)
// ============================================================
router.put('/organisations/:id', logoUpload.single('logo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const data = req.body;
    const file = (req as any).file;

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    if (file) {
      data.logo_url = `/public/organisations/${file.filename}`;
    }

    await organisation.update(data);

    res.json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET REGISTRATION REQUESTS (unapproved: pending, hold, denied)
// ============================================================
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';

    const offset = (page - 1) * limit;
    const where: any = {};

    if (status === 'pending') {
      where.is_approved = 0;
    } else if (status === 'hold') {
      where.is_approved = 2;
    } else if (status === 'denied') {
      where.is_approved = 3;
    } else {
      where.is_approved = { [Op.ne]: 1 };
    }

    if (search) {
      where[Op.and] = [
        ...(where.is_approved !== undefined ? [{ is_approved: where.is_approved }] : [{ is_approved: { [Op.ne]: 1 } }]),
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { city: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
        },
      ];
      delete where.is_approved;
    }

    const { count, rows } = await Organisations.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: limit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching registration requests:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// APPROVE REGISTRATION REQUEST
// ============================================================
router.put('/requests/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.update({
      is_approved: 1,
      is_active: true,
    });

    res.json({
      success: true,
      message: 'Organisation registration approved successfully!',
      data: organisation,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// HOLD REGISTRATION REQUEST (with message)
// ============================================================
router.put('/requests/:id/hold', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { message } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Hold message/reason is required' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.update({
      is_approved: 2,
      is_active: false,
      block_reason: message.trim(),
    });

    res.json({
      success: true,
      message: 'Organisation registration put on hold.',
      data: organisation,
    });
  } catch (error) {
    console.error('Error holding request:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// DENY REGISTRATION REQUEST (with message)
// ============================================================
router.put('/requests/:id/deny', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { message } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Deny message/reason is required' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.update({
      is_approved: 3,
      is_active: false,
      block_reason: message.trim(),
    });

    res.json({
      success: true,
      message: 'Organisation registration denied.',
      data: organisation,
    });
  } catch (error) {
    console.error('Error denying request:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// DELETE ORGANISATION
// ============================================================
router.delete('/organisations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.destroy();

    res.json({ success: true, message: 'Organisation deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// TOGGLE ORGANISATION STATUS
// ============================================================
router.patch('/organisations/:id/toggle-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.update({ is_active: !organisation.is_active });

    res.json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// ADMIN - GET ALL VISITORS (with organisation filter)
// ============================================================
router.get('/visitors', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const search = req.query.search as string || '';
    const organisationId = req.query.organisation_id as string;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { mobile_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (organisationId) {
      where.organisation_id = parseInt(organisationId);
    }

    const { count, rows } = await Visitors.findAndCountAll({
      where,
      include: [
        {
          model: Organisations,
          as: 'organisation',
          attributes: ['id', 'name', 'code'],
        },
      ],
      attributes: ['id', 'full_name', 'designation', 'company', 'location', 'email', 'linkedin', 'mobile_number'],
      order: [['id', 'DESC']],
      limit: limit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// ADMIN - GET ALL VISITS (with organisation filter)
// ============================================================
router.get('/visits', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    const organisationId = req.query.organisation_id as string;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (organisationId) {
      where.organisation_id = parseInt(organisationId);
    }

    const { count, rows } = await VisitorVisits.findAndCountAll({
      where,
      include: [
        {
          model: Visitors,
          as: 'visitor',
          attributes: ['id', 'full_name', 'company', 'mobile_number'],
        },
        {
          model: People,
          as: 'host',
          attributes: ['id', 'full_name', 'designation', 'email'],
        },
        {
          model: Organisations,
          as: 'organisation',
          attributes: ['id', 'name', 'code'],
        },
      ],
      attributes: ['id', 'visitor_id', 'host_id', 'organisation_id', 'purpose_of_visit', 'reference', 'selfie_url', 'check_in_time', 'host_available_at_submission', 'confirmation_message'],
      order: [['check_in_time', 'DESC']],
      limit: limit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: page,
        limit: limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;