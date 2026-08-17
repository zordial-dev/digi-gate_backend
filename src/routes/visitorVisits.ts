import { Router } from 'express';
import { VisitorVisits, Organisations, People, Visitors } from '../models/index.js';
import { createUpload } from '../middleware/upload.js';

const router = Router();

// Create upload instance
const upload = createUpload({
  folder: 'selfies',
  filename: `visitor_${Date.now()}`
});

// POST /api/visitor-visits
router.post('/', upload.single('selfie'), async (req, res) => {
  try {
    const {
      organisation_id,
      visitor_id,
      host_id,
      purpose_of_visit,
      reference,
      otp_verified,
    } = req.body;

    // Validation
    if (!visitor_id) {
      return res.status(400).json({ error: 'Visitor ID required' });
    }
    if (!host_id) {
      return res.status(400).json({ error: 'Host selection required' });
    }
    if (!purpose_of_visit || purpose_of_visit.length < 5) {
      return res.status(400).json({ error: 'Purpose must be at least 5 characters' });
    }

    // Get host details
    const host = await People.findByPk(host_id, {
      attributes: ['is_available', 'full_name'],
    });

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    // Get visitor details
    const visitor = await Visitors.findByPk(visitor_id, {
      attributes: ['full_name'],
    });

    // Get organisation messages
    const org = await Organisations.findByPk(organisation_id, {
      attributes: ['host_available_message', 'host_unavailable_message'],
    });

    // Generate confirmation message
    const isHostAvailable = host.is_available ?? true;
    let confirmationMessage = '';

    if (isHostAvailable) {
      confirmationMessage = org?.host_available_message || 
        'Thank you for visiting :visitor_name! :host_name will be with you shortly.';
    } else {
      confirmationMessage = org?.host_unavailable_message || 
        'Thank you for your interest :visitor_name. :host_name is currently unavailable.';
    }

    // Replace placeholders using regex for :group format
    const visitorName = visitor?.full_name || 'Guest';
    const hostName = host.full_name || 'Host';
    
    // Using regex to replace :visitor_name and :host_name
    confirmationMessage = confirmationMessage.replace(/:visitor_name/g, visitorName);
    confirmationMessage = confirmationMessage.replace(/:host_name/g, hostName);

    const file = (req as any).file;
    const selfieUrl = file ? `/selfies/${file.filename}` : null;

    // Create visit
    const visit = await VisitorVisits.create({
      visitor_id: parseInt(visitor_id),
      organisation_id: parseInt(organisation_id || '0'),
      host_id: parseInt(host_id),
      purpose_of_visit,
      reference: reference || null,
      selfie_url: selfieUrl,
      otp_verified: otp_verified === 'true',
      otp_code: null,
      otp_expires_at: null,
      otp_attempts: 0,
      otp_sent_at: new Date(),
      otp_verified_at: otp_verified === 'true' ? new Date() : null,
      host_available_at_submission: isHostAvailable,
      confirmation_message: confirmationMessage,
    });

    res.status(201).json({
      success: true,
      data: visit,  
      confirmation: {
        message: confirmationMessage,
        host_available: isHostAvailable,
        host_name: host.full_name,
        visitor_name: visitor?.full_name || 'Guest',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default router;