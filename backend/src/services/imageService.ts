import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface TemplateMeta {
  textSlot: { x: number; y: number; maxWidth?: number; width?: number; height?: number; fontSize: number; color: string };
  photoSlot: { x: number; y: number; width: number; height: number; shape?: 'rect' | 'circle' };
}

const templatesRoot = path.join(__dirname, '..', '..', 'templates');
const generatedRoot = path.join(__dirname, '..', '..', 'generated');

export async function generateFromTemplate(templateBaseName: string, text: string, textOptions: { fontSize?: number; color?: string }, photoPath?: string) {
  // resolve template path: try common extensions for the base name
  const tryExt = ['.png', '.jpg', '.jpeg'];
  let templatePath: string | null = null;
  const base = path.join(templatesRoot, templateBaseName.replace(/\.(png|jpg|jpeg)$/i, ''));
  for (const e of tryExt) {
    const p = base + e;
    if (fs.existsSync(p)) {
      templatePath = p;
      break;
    }
  }
  if (!templatePath) throw new Error('Template not found');

  // Load metadata JSON if exists: templates/<base>.json
  let meta: TemplateMeta;
  const metaPath = base + '.json';
  if (fs.existsSync(metaPath)) {
    try {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      meta = JSON.parse(raw) as TemplateMeta;
    } catch (e) {
      throw new Error('Failed to parse template metadata');
    }
  } else {
    // fallback defaults (use dark blue to match frontend)
    meta = { textSlot: { x: 800, y: 200, maxWidth: 1200, fontSize: 72, color: '#0b3d91' }, photoSlot: { x: 200, y: 250, width: 400, height: 400, shape: 'circle' } };
  }

  // Use template's natural size as output size so frontend preview (which draws template at natural size) aligns
  const templateImage = sharp(templatePath);
  const metadata = await templateImage.metadata();
  const width = metadata.width || 1920;
  const height = metadata.height || 1080;

  // Start with template as background at natural size
  let composite: sharp.Sharp = templateImage.resize(width, height, { fit: 'cover' });

  const layers: sharp.OverlayOptions[] = [];

  if (photoPath) {
    // prepare photo: crop center and resize to photoSlot
    const photoBuffer = await sharp(photoPath).resize(meta.photoSlot.width, meta.photoSlot.height, { fit: 'cover' }).toBuffer();

    if (meta.photoSlot.shape === 'circle') {
      const circleSvg = Buffer.from(
        `<svg><circle cx="${meta.photoSlot.width / 2}" cy="${meta.photoSlot.height / 2}" r="${Math.min(meta.photoSlot.width, meta.photoSlot.height) / 2}" /></svg>`
      );
      const masked = await sharp(photoBuffer).composite([{ input: circleSvg, blend: 'dest-in' }]).png().toBuffer();
      layers.push({ input: masked, left: meta.photoSlot.x, top: meta.photoSlot.y });
    } else {
      layers.push({ input: photoBuffer, left: meta.photoSlot.x, top: meta.photoSlot.y });
    }
  }

  // Render text to PNG using SVG
  const finalFontSize = textOptions.fontSize || meta.textSlot.fontSize;
  const color = textOptions.color || meta.textSlot.color;
  // simple word-wrapping: estimate character width and break into lines to fit maxWidth
  const maxWidth = meta.textSlot.maxWidth || meta.textSlot.width || 600;
  const maxHeight = meta.textSlot.height || (finalFontSize * 2);
  // estimate char width (approx 0.6 * fontSize)
  const estCharWidth = finalFontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / estCharWidth);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxCharsPerLine) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);

  const lineHeightMultiplier = 1.2;
  let fontSizeToUse = finalFontSize;
  while (lines.length * (fontSizeToUse * lineHeightMultiplier) > maxHeight && fontSizeToUse > 10) {
    fontSizeToUse -= 2;
  }

  // build svg with tspans centered within the text slot
  const lineHeight = Math.round(fontSizeToUse * lineHeightMultiplier);
  const totalTextHeight = lines.length * lineHeight;
  const slotHeight = meta.textSlot.height || (lines.length * fontSizeToUse * 1.2);
  const startY = meta.textSlot.y + Math.max(0, Math.round((slotHeight - totalTextHeight) / 2));

  const svgLines = lines.map((ln, idx) => {
    const x = meta.textSlot.x + (meta.textSlot.width ? meta.textSlot.width / 2 : 0);
    const y = startY + (idx * lineHeight) + (lineHeight / 2);
    return `<tspan x="${x}" y="${y}">${escapeXml(ln)}</tspan>`;
  }).join('');

  const textAnchor = meta.textSlot.textAlign === 'center' ? 'middle' : 'start';

  const svgText = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>
      /* Prefer Montserrat (loaded by frontend). Fallback to system sans-serif for servers without web fonts. */
      .title { font-family: 'Montserrat', 'Arial', sans-serif; font-size: ${fontSizeToUse}px; fill: ${color}; font-weight: 700; text-anchor: ${textAnchor}; dominant-baseline: middle; }
    </style>
    <text class="title">${svgLines}</text>
  </svg>
  `;

  const textBuffer = Buffer.from(svgText);
  layers.push({ input: textBuffer, left: 0, top: 0 });

  const outName = `${uuidv4()}.png`;
  const outPath = path.join(generatedRoot, outName);

  await composite.composite(layers).png({ quality: 90 }).toFile(outPath);

  // return a path suitable to be fetched by frontend via /api/generated
  return { path: outPath, url: `/api/generated/${outName}` };
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[&<>'"]/g, function (c) {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
