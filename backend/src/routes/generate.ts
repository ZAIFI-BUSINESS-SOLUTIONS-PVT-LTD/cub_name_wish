import express from 'express';
// import multer from 'multer'; // photo upload currently disabled (commented out for future use)
import path from 'path';
import { generateFromTemplate } from '../services/imageService';
import { saveGreeting } from '../db';

const router = express.Router();

// const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads') , limits: { fileSize: 5 * 1024 * 1024 }});
// NOTE: photo upload handler is commented out so uploads are not accepted/stored.
// To re-enable, uncomment the multer import and the `upload` lines above and the middleware below.
router.post('/', async (req, res) => {
  try {
  const name = (req.body.name || '').toString().slice(0, 100);
  const phone = (req.body.phone || '').toString().slice(0, 50);
  const fontSize = req.body.fontSize ? parseInt(req.body.fontSize, 10) : undefined;
  const color = req.body.color || undefined;
  const template = req.body.template ? String(req.body.template) : 'teachersday';
  // const photoFile = req.file ? req.file.path : undefined;
  // Photo handling disabled for now. Keep the variable here as undefined so downstream code is unaffected.
  const photoFile = undefined;

  const result = await generateFromTemplate(template, name, { fontSize, color }, photoFile);

  // attempt to save metadata to DB (will be noop if DB not configured)
  try {
    const saved = await saveGreeting(name || null, phone || null, result.url);
    // include DB id/timestamp if available
    return res.json({ ok: true, url: result.url, db: saved || null });
  } catch (e) {
    return res.json({ ok: true, url: result.url });
  }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'Processing error' });
  }
});

export default router;
