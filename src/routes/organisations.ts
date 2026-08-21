import { Router } from 'express';
import { Organisations, People, Visitors, VisitorVisits } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { createUpload } from '../middleware/upload.js';

const router = Router();

// ============================================================
// GET /api/organisations/:id - Get organisation by ID 
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id, {
      include: {
        model: People,
        as: 'people',
        where: { is_active: true },
        attributes: ['id', 'full_name', 'designation', 'email', 'profile_pic', 'is_available', 'unavailable_dates'],
        required: false,
      },
    });

    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const orgData = organisation.toJSON();
    if (orgData.people) {
      orgData.people = orgData.people.map((person: any) => {
        const dates = Array.isArray(person.unavailable_dates) ? person.unavailable_dates : [];
        const isDateOff = dates.includes(todayStr);
        const toggleAvailable = person.is_available ?? true;
        return {
          ...person,
          is_available_toggle: toggleAvailable,
          is_date_unavailable: isDateOff,
          is_available: toggleAvailable && !isDateOff,
          unavailable_dates: dates,
        };
      });
    }

    res.json({ success: true, data: orgData });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

const logoUpload = createUpload({
  folder: 'organisations',
  filename: `logo_${Date.now()}`
});

router.put('/:id', logoUpload.single('logo'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    const data = req.body;
    const file = (req as any).file;
    if (file) {
      data.logo_url = `/organisations/${file.filename}`;
    }

    await organisation.update(data);

    res.json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/settings - Get organisation settings
// ============================================================
router.get('/:id/settings', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const organisation = await Organisations.findByPk(id, {
      attributes: ['host_available_message', 'host_unavailable_message'],
    });

    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    res.json({
      success: true,
      data: {
        host_available_message: organisation.host_available_message,
        host_unavailable_message: organisation.host_unavailable_message,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PUT /api/organisations/:id/settings - Update organisation settings
// ============================================================
router.put('/:id/settings', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { host_available_message, host_unavailable_message } = req.body;

    const organisation = await Organisations.findByPk(id);
    if (!organisation) {
      return res.status(404).json({ success: false, error: 'Organisation not found' });
    }

    await organisation.update({
      host_available_message: host_available_message || organisation.host_available_message,
      host_unavailable_message: host_unavailable_message || organisation.host_unavailable_message,
    });

    res.json({ success: true, data: organisation });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/hosts - Get all hosts for organisation
// ============================================================
router.get('/:id/hosts', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.query;

    const where: any = { organisation_id: id };
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const hosts = await People.findAll({
      where,
      attributes: ['id', 'full_name', 'email', 'mobile_number', 'designation', 'department', 'profile_pic', 'is_available', 'unavailable_dates', 'is_active'],
      order: [['full_name', 'ASC']],
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const hostsData = hosts.map((h: any) => {
      const item = h.toJSON();
      const dates = Array.isArray(item.unavailable_dates) ? item.unavailable_dates : [];
      const isDateOff = dates.includes(todayStr);
      const toggleAvailable = item.is_available ?? true;
      return {
        ...item,
        is_available_toggle: toggleAvailable,
        is_date_unavailable: isDateOff,
        is_available: toggleAvailable && !isDateOff,
        unavailable_dates: dates,
      };
    });

    res.json({ success: true, data: hostsData });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/visitors - Get all visitors for organisation
// ============================================================
router.get('/:id/visitors', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { page = 1, limit = 20, search, sortBy = 'id', sortOrder = 'DESC' } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { organisation_id: id };

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { mobile_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const validSortBy = sortBy === 'created_at' ? 'id' : (sortBy as string);

    const { count, rows } = await Visitors.findAndCountAll({
      where,
      attributes: ['id', 'full_name', 'designation', 'company', 'location', 'email', 'linkedin', 'mobile_number'],
      order: [[validSortBy, sortOrder as string]],
      limit: parseInt(limit as string),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/visits - Get all visits for organisation
// ============================================================
router.get('/:id/visits', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { page = 1, limit = 20, startDate, endDate, hostId, visitorId } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { organisation_id: id };

    if (startDate) {
      where.visit_date = { ...where.visit_date, [Op.gte]: new Date(startDate as string) };
    }
    if (endDate) {
      where.visit_date = { ...where.visit_date, [Op.lte]: new Date(endDate as string) };
    }
    if (hostId) {
      where.host_id = parseInt(hostId as string);
    }
    if (visitorId) {
      where.visitor_id = parseInt(visitorId as string);
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
          attributes: ['id', 'full_name', 'designation'],
        },
      ],
      order: [['check_in_time', 'DESC']],
      limit: parseInt(limit as string),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/visits/today - Get today's visits
// ============================================================
router.get('/:id/visits/today', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visits = await VisitorVisits.findAll({
      where: {
        organisation_id: id,
        check_in_time: {
          [Op.gte]: today,
        },
      },
      include: [
        {
          model: Visitors,
          as: 'visitor',
          attributes: ['id', 'full_name', 'company'],
        },
        {
          model: People,
          as: 'host',
          attributes: ['id', 'full_name'],
        },
      ],
      order: [['check_in_time', 'DESC']],
    });

    res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/dashboard/stats - Get dashboard statistics
// ============================================================
router.get('/:id/dashboard/stats', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVisitors, totalVisits, todayVisits, activeHosts] = await Promise.all([
      Visitors.count({ where: { organisation_id: id } }),
      VisitorVisits.count({ where: { organisation_id: id } }),
      VisitorVisits.count({
        where: {
          organisation_id: id,
          check_in_time: {
            [Op.gte]: today,
          },
        },
      }),
      People.count({
        where: {
          organisation_id: id,
          is_available: true,
          is_active: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total_visitors: totalVisitors,
        total_visits: totalVisits,
        today_visits: todayVisits,
        active_hosts: activeHosts,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/dashboard/recent - Get recent visits
// ============================================================
router.get('/:id/dashboard/recent', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { limit = 5 } = req.query;

    const visits = await VisitorVisits.findAll({
      where: { organisation_id: id },
      include: [
        {
          model: Visitors,
          as: 'visitor',
          attributes: ['id', 'full_name', 'company'],
        },
        {
          model: People,
          as: 'host',
          attributes: ['id', 'full_name'],
        },
      ],
      order: [['check_in_time', 'DESC']],
      limit: parseInt(limit as string),
    });

    res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// GET /api/organisations/:id/dashboard/visitor-stats - Visitor statistics by day
// ============================================================
router.get('/:id/dashboard/visitor-stats', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const visits = await VisitorVisits.findAll({
      where: {
        organisation_id: id,
        check_in_time: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('check_in_time')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('check_in_time'))],
      order: [[sequelize.fn('DATE', sequelize.col('check_in_time')), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: visits });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;