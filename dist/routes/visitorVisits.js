import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Organisations, People, Visitors } from '../models/index.js';
import { pool } from '../config/database.js';
const router = Router();
// Memory storage for multer: files are buffered in RAM and NEVER written to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
// Middleware to handle multer 413 file size errors gracefully
const handleUpload = (req, res, next) => {
    upload.single('selfie')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ success: false, error: 'Selfie file exceeds 5 MB limit' });
        }
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
};
// POST /api/visitor-visits
router.post('/', handleUpload, async (req, res) => {
    const client = await pool.connect();
    try {
        const { organisation_id, visitor_id, host_id, purpose_of_visit, reference, otp_verified, selfie_base64, } = req.body;
        console.log('=== VISIT CREATION REQUEST ===');
        console.log('Body:', req.body);
        console.log('Memory File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'None');
        // Validation
        if (!visitor_id) {
            return res.status(400).json({ success: false, error: 'Visitor ID is required' });
        }
        if (!host_id) {
            return res.status(400).json({ success: false, error: 'Please select a Host person for your visit' });
        }
        if (!purpose_of_visit || purpose_of_visit.trim().length < 5) {
            return res.status(400).json({ success: false, error: 'Purpose of visit must be at least 5 characters long' });
        }
        // Get host details
        const host = await People.findByPk(host_id, {
            attributes: ['is_available', 'unavailable_dates', 'full_name'],
        });
        if (!host) {
            return res.status(404).json({ success: false, error: 'Selected Host was not found' });
        }
        // Get visitor details
        const visitor = await Visitors.findByPk(visitor_id, {
            attributes: ['full_name'],
        });
        // Get organisation messages
        const org = await Organisations.findByPk(organisation_id, {
            attributes: ['host_available_message', 'host_unavailable_message'],
        });
        // Generate confirmation message using dual check (Toggle AND Calendar dates)
        const todayStr = new Date().toISOString().split('T')[0];
        const dates = Array.isArray(host.unavailable_dates) ? host.unavailable_dates : [];
        const isDateOff = dates.includes(todayStr);
        const toggleAvailable = host.is_available ?? true;
        const isHostAvailable = toggleAvailable && !isDateOff;
        let confirmationMessage = '';
        if (isHostAvailable) {
            confirmationMessage = org?.host_available_message ||
                'Thank you for visiting :visitor_name! :host_name will be with you shortly.';
        }
        else {
            confirmationMessage = org?.host_unavailable_message ||
                'Thank you for your interest :visitor_name. :host_name is currently unavailable.';
        }
        // Replace placeholders supporting both :variable and {variable} formats
        const visitorName = visitor?.full_name || 'Guest';
        const hostName = host.full_name || 'Host';
        confirmationMessage = confirmationMessage
            .replace(/:visitor_name/g, visitorName)
            .replace(/\{visitor_name\}/g, visitorName)
            .replace(/:visitor/g, visitorName)
            .replace(/\{visitor\}/g, visitorName)
            .replace(/:host_name/g, hostName)
            .replace(/\{host_name\}/g, hostName)
            .replace(/:host/g, hostName)
            .replace(/\{host\}/g, hostName);
        // Extract image buffer if file or base64 provided
        let imageBuffer = null;
        let mimeType = 'image/jpeg';
        let ext = 'jpg';
        const file = req.file;
        if (file && file.buffer) {
            imageBuffer = file.buffer;
            mimeType = file.mimetype || 'image/jpeg';
            const rawExt = path.extname(file.originalname).replace('.', '').toLowerCase();
            ext = rawExt === 'png' ? 'png' : (rawExt === 'webp' ? 'webp' : 'jpg');
        }
        else if (selfie_base64 && typeof selfie_base64 === 'string') {
            const match = selfie_base64.trim().match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
            if (match) {
                const mimeSub = match[1].toLowerCase();
                mimeType = mimeSub === 'jpg' ? 'image/jpeg' : `image/${mimeSub}`;
                ext = (mimeSub === 'jpeg' || mimeSub === 'jpg') ? 'jpg' : mimeSub;
                imageBuffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
            }
        }
        let selfieUrl = null;
        let filename = null;
        if (imageBuffer && imageBuffer.length > 0) {
            if (imageBuffer.length > 5 * 1024 * 1024) {
                return res.status(413).json({ success: false, error: 'Selfie exceeds 5 MB limit' });
            }
            filename = `visitor_${Date.now()}.${ext}`;
            selfieUrl = `/selfies/${filename}`;
        }
        // Atomic transaction for database inserts
        await client.query('BEGIN');
        // Create visit record
        const visitInsertQuery = `
      INSERT INTO visitor_visits (
        visitor_id, organisation_id, host_id, purpose_of_visit, reference,
        selfie_url, host_available_at_submission, confirmation_message,
        visit_date, check_in_time
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        CURRENT_DATE, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;
        const visitResult = await client.query(visitInsertQuery, [
            parseInt(visitor_id),
            parseInt(organisation_id || '0'),
            parseInt(host_id),
            purpose_of_visit,
            reference || null,
            selfieUrl,
            isHostAvailable,
            confirmationMessage,
        ]);
        const visit = visitResult.rows[0];
        // If selfie present, insert bytes into visit_selfies
        if (filename && imageBuffer) {
            await client.query(`INSERT INTO visit_selfies (
           filename, visit_id, data, mime_type, byte_size, uploaded_at
         ) VALUES ($1, $2, $3, $4, $5, NOW())`, [filename, visit.id, imageBuffer, mimeType, imageBuffer.length]);
        }
        await client.query('COMMIT');
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating visit:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    finally {
        client.release();
    }
});
export default router;
