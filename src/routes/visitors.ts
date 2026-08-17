import { Router } from 'express';
import { Visitors, VisitorVisits } from '../models/index.js';

const router = Router();

// GET /api/visitors/check
router.get('/check', async (req, res) => {
  try {
    const { mobile_number, organisation_id } = req.query;

    if (!mobile_number || typeof mobile_number !== 'string') {
      return res.status(400).json({ error: 'Mobile number required' });
    }

    const visitor = await Visitors.findOne({
      where: { mobile_number },
      attributes: ['id', 'full_name', 'designation', 'company', 'location', 'email', 'linkedin', 'mobile_number'],
    });

    if (visitor) {
      const previousVisit = await VisitorVisits.findOne({
        where: {
          visitor_id: visitor.id,
          organisation_id: parseInt(organisation_id as string || '0'),
        },
        order: [['check_in_time', 'DESC']],
      });

      return res.json({
        success: true,
        isReturning: true,
        data: visitor,
        lastVisit: previousVisit,
      });
    }

    res.json({ success: true, isReturning: false, data: null });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/visitors
router.post('/', async (req, res) => {
  try {
    const visitor = await Visitors.create({
      organisation_id: req.body.organisation_id,
      full_name: req.body.full_name,
      designation: req.body.designation,
      company: req.body.company,
      location: req.body.location || null,
      email: req.body.email || null,
      linkedin: req.body.linkedin || null,
      mobile_number: req.body.mobile_number,
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;