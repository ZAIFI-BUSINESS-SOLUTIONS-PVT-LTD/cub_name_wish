import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ensure uploads/generated/templates folders exist
const base = path.resolve(__dirname, '..');
const uploadsDir = path.join(base, 'uploads');
const generatedDir = path.join(base, 'generated');
const templatesDir = path.join(base, 'templates');
[uploadsDir, generatedDir, templatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// serve generated images
app.use('/generated', express.static(generatedDir));
app.use('/templates', express.static(templatesDir));

// generate route
import generateRouter from './routes/generate';
import { startCleanup } from './services/cleanupService';
app.use('/generate', generateRouter);
app.use('/api/generate', generateRouter);
app.use('/api/generate', generateRouter);

// template management route
import templateRouter from './routes/template';
app.use('/api', templateRouter);

startCleanup();

// also expose API-prefixed static routes so frontend can fetch via /api/* reliably
app.use('/api/generated', express.static(generatedDir));
app.use('/api/templates', express.static(templatesDir));

// convenience check to confirm template exists
app.get('/api/template-check', (_req, res) => {
  const tryPaths = ['teachersday.png', 'teachersday.jpg', 'teachersday.jpeg'].map(f => path.join(templatesDir, f));
  for (const p of tryPaths) {
    try {
      const stat = fs.statSync(p);
      if (stat && stat.size > 0) return res.json({ ok: true, path: path.basename(p), size: stat.size });
    } catch (e) {
      // continue
    }
  }
  return res.status(404).json({ ok: false, message: 'template missing' });
});

// return template metadata for a given template name (template JSON expected at templates/<name>.json)
app.get('/api/template-meta', (req, res) => {
  const name = (req.query.name as string) || 'teachersday';
  const metaPath = path.join(templatesDir, `${name}.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).json({ ok: false, message: 'meta not found' });
  try {
    const json = fs.readFileSync(metaPath, 'utf-8');
    return res.json({ ok: true, meta: JSON.parse(json) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'failed to read meta' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
