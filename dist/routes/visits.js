import { Router } from 'express';
import { pool } from '../config/database.js';
const router = Router();
// POST /visits handler
export const createVisitHandler = async (req, res) => {
    const { selfie_base64 } = req.body || {};
    // 1. Validate presence of selfie_base64
    if (!selfie_base64 || typeof selfie_base64 !== 'string') {
        res.status(400).json({
            error: 'Missing or invalid selfie_base64. Expected data URL: data:image/(jpeg|png|webp);base64,...',
        });
        return;
    }
    // 2. Validate format: data:image/(jpeg|png|webp);base64,...
    const match = selfie_base64.trim().match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+|\s*.*)$/);
    if (!match) {
        res.status(400).json({
            error: 'Invalid selfie_base64 format. Expected data URL: data:image/(jpeg|png|webp);base64,...',
        });
        return;
    }
    const rawMimeSub = match[1].toLowerCase();
    const mimeType = rawMimeSub === 'jpg' ? 'image/jpeg' : `image/${rawMimeSub}`;
    const ext = (rawMimeSub === 'jpeg' || rawMimeSub === 'jpg') ? 'jpg' : rawMimeSub;
    let buffer;
    try {
        buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    }
    catch {
        res.status(400).json({ error: 'Failed to decode base64 data' });
        return;
    }
    if (buffer.length === 0) {
        res.status(400).json({ error: 'Empty selfie image data' });
        return;
    }
    // 3. Reject files > 5 MB with 413
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
        res.status(413).json({ error: 'File size exceeds 5 MB limit' });
        return;
    }
    // 4. Generate filename: visitor_<Date.now()>.<ext>
    const filename = `visitor_${Date.now()}.${ext}`;
    const selfieUrl = `/selfies/${filename}`;
    // 5. In one transaction: Insert into visitor_visits and visit_selfies
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let visitorId = req.body.visitor_id;
        let organisationId = req.body.organisation_id;
        let hostId = req.body.host_id;
        if (!visitorId) {
            const v = await client.query('SELECT id FROM visitors LIMIT 1');
            visitorId = v.rows[0]?.id || 1;
        }
        if (!organisationId) {
            const o = await client.query('SELECT id FROM organisations LIMIT 1');
            organisationId = o.rows[0]?.id || 1;
        }
        if (!hostId) {
            const h = await client.query('SELECT id FROM people LIMIT 1');
            hostId = h.rows[0]?.id || 1;
        }
        const purpose = req.body.purpose_of_visit || 'General Visit';
        const reference = req.body.reference || null;
        const visitInsertQuery = `
      INSERT INTO visitor_visits (
        visitor_id, organisation_id, host_id, purpose_of_visit, reference, selfie_url, visit_date, check_in_time
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_TIMESTAMP)
      RETURNING id, selfie_url;
    `;
        const visitRes = await client.query(visitInsertQuery, [
            visitorId,
            organisationId,
            hostId,
            purpose,
            reference,
            selfieUrl,
        ]);
        const visit = visitRes.rows[0];
        const selfieInsertQuery = `
      INSERT INTO visit_selfies (
        filename, visit_id, data, mime_type, byte_size, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, NOW());
    `;
        await client.query(selfieInsertQuery, [
            filename,
            visit.id,
            buffer,
            mimeType,
            buffer.length,
        ]);
        await client.query('COMMIT');
        // 6. Respond with { id, selfie_url }
        res.status(201).json({
            id: visit.id,
            selfie_url: visit.selfie_url,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction rolled back on error:', error);
        res.status(500).json({ error: error.message || 'Failed to create visit' });
    }
    finally {
        client.release();
    }
};
router.post('/', createVisitHandler);
export default router;
