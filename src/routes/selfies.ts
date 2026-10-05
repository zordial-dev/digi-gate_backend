import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

const router = Router();
const FILENAME_REGEX = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/;

export const getSelfieHandler = async (req: Request, res: Response): Promise<void> => {
  const filename = typeof req.params.filename === 'string' ? req.params.filename : '';

  // Validate filename with ^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$
  if (!filename || !FILENAME_REGEX.test(filename)) {
    res.status(404).send('Not Found');
    return;
  }

  try {
    const { rows } = await pool.query(
      'SELECT data, mime_type FROM visit_selfies WHERE filename = $1',
      [filename]
    );

    if (rows.length === 0) {
      res.status(404).send('Not Found');
      return;
    }

    const { data, mime_type } = rows[0];

    // Set caching and content headers as required
    res.set({
      'Content-Type': mime_type || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${filename}"`,
    });

    // Return raw bytes (Buffer), not base64
    res.send(data);
  } catch (error) {
    console.error('Error fetching selfie from database:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/:filename', getSelfieHandler);

export default router;
