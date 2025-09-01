import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

// remove generated files older than 24 hours
const generatedDir = path.join(__dirname, '..', '..', 'generated');

export function startCleanup() {
  // run every day at 03:00
  cron.schedule('0 3 * * *', () => {
    const files = fs.readdirSync(generatedDir);
    const now = Date.now();
    files.forEach(f => {
      try {
        const p = path.join(generatedDir, f);
        const stat = fs.statSync(p);
        if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) fs.unlinkSync(p);
      } catch (e) {
        // ignore
      }
    });
  });
}
