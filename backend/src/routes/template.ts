import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const templatesRoot = path.join(__dirname, '..', '..', 'templates');

router.post('/update-template', (req, res) => {
  const { template, meta } = req.body;

  if (!template || !meta) {
    return res.status(400).json({ error: 'Missing template name or metadata' });
  }

  const metaPath = path.join(templatesRoot, `${template}.json`);

  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Template not found' });
  }

  try {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    res.status(200).json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Failed to write template file', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

export default router;
