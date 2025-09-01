import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// A simple icon component for UI
const Icon: React.FC<{ path: string; className?: string }> = ({ path, className }) => (
  <svg className={className || 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>
);

// --- Text rendering logic to precisely match backend SVG rendering ---

const getBackendWrappedLines = (text: string, fontSize: number, maxWidth: number): string[] => {
  const estCharWidth = fontSize * 0.6;
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
  return lines;
};

const getBackendFontSize = (lines: string[], initialFontSize: number, maxHeight: number) => {
  const lineHeightMultiplier = 1.2;
  let fontSizeToUse = initialFontSize;
  while (lines.length * (fontSizeToUse * lineHeightMultiplier) > maxHeight && fontSizeToUse > 10) {
    fontSizeToUse -= 2;
  }
  return fontSizeToUse;
};

const Editor: React.FC = () => {
  const [name, setName] = useState('');
  // Capture user's phone locally (not sent to backend and not used in template)
  const [phone, setPhone] = useState('');
  // Photo upload/preview temporarily disabled. Kept as state for future re-enable.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'template1' | 'template2'>('template2');
  const [meta, setMeta] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false);

  const templates = {
    template1: { name: 'Modern Blue', src: '/api/templates/template1.jpg' },
    template2: { name: 'Golden Arch', src: '/api/templates/template2.jpg' },
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/api/templates/${selectedTemplate}.json`);
        if (!cancelled) setMeta(res.data);
      } catch (e) {
        console.error('Failed to load template metadata', e);
        setError('Could not load template details. Please try again.');
      }
    })();
    return () => { cancelled = true };
  }, [selectedTemplate]);

  // Photo preview effect commented out because uploads are disabled for now.
  // Keep code here (commented) so it's easy to restore later.
  /*
  useEffect(() => {
    if (photo) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(photo);
    } else {
      setPhotoPreview(null);
    }
  }, [photo]);
  */

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !meta) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const template = new Image();
    template.crossOrigin = 'anonymous';
    template.src = templates[selectedTemplate].src;

    template.onload = () => {
      canvas.width = template.naturalWidth;
      canvas.height = template.naturalHeight;
      ctx.drawImage(template, 0, 0);

  // Photo drawing disabled: user uploads are currently not accepted/placed into templates.
  // To re-enable, restore the photoPreview block above and this drawing logic.

  const { x, y, width, height, fontSize, color, fontFamily = 'Montserrat, Arial, sans-serif', textAlign = 'start' } = meta.textSlot;
      const lines = getBackendWrappedLines(name || '', fontSize, width);
      const fontSizeToUse = getBackendFontSize(lines, fontSize, height);
      // keep line-height consistent with backend calculation (1.2 multiplier)
      const lineHeight = Math.round(fontSizeToUse * 1.2);
      const totalTextHeight = lines.length * lineHeight;
      const slotHeight = height || (lines.length * lineHeight);
      const startY = y + Math.max(0, Math.round((slotHeight - totalTextHeight) / 2));

  // ensure canvas uses same font stack (Montserrat preferred)
  ctx.font = `bold ${fontSizeToUse}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = textAlign as CanvasTextAlign;
      ctx.textBaseline = 'middle';

      lines.forEach((line, idx) => {
        const lineY = startY + (idx * lineHeight) + (lineHeight / 2);
        const xPos = x + (textAlign === 'center' ? width / 2 : 0);
        ctx.fillText(line, xPos, lineY);
      });

  if (debugMode) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 5;
        ctx.strokeRect(meta.photoSlot.x, meta.photoSlot.y, meta.photoSlot.width, meta.photoSlot.height);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
        ctx.strokeRect(meta.textSlot.x, meta.textSlot.y, meta.textSlot.width, meta.textSlot.height);
      }
    };

    template.onerror = () => {
      setError('Failed to load template image.');
    };

  }, [name, photoPreview, meta, selectedTemplate, templates, debugMode]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const onGenerate = async (autoDownload = true): Promise<string | undefined> => {
    if (!name) {
      setError('Please enter a name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
  form.append('name', name.slice(0, 50));
  form.append('template', selectedTemplate);
    // include phone for backend storage only (not used in template rendering)
    if (phone) form.append('phone', phone.slice(0, 50));
  // Photo upload disabled: do not append file to form data.
  // if (photo) form.append('photo', photo);

      const res = await axios.post('/api/generate', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data.url.startsWith('/generated') ? `/api${res.data.url}` : res.data.url;

      if (autoDownload) {
        const blobRes = await axios.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(blobRes.data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = res.data.url.split('/').pop() || 'greeting.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      }
      return `${window.location.origin}${url}`;
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.error || 'Failed to generate image. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const share = async (platform: 'whatsapp' | 'email') => {
    const url = await onGenerate(false);
    if (!url) return;
    const text = `Happy Teacher's Day! Here's a personalized greeting: ${url}`;
    const shareUrl = platform === 'whatsapp'
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `mailto:?subject=${encodeURIComponent("Happy Teacher's Day Greeting")}&body=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  const handleSaveTemplate = async () => {
    try {
      await axios.post('/api/update-template', { template: selectedTemplate, meta });
      alert('Template saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-pink-500 text-white p-2 rounded-lg">CUB</div>
            <h1 className="text-xl font-bold text-slate-800">Greeting Card Generator</h1>
          </div>
          <div className="flex items-center gap-4">
            <label htmlFor="debugMode" className="text-sm text-slate-600">Dev Mode</label>
            <input type="checkbox" id="debugMode" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 card p-6 sm:p-8 space-y-6 self-start">
            {debugMode && meta && (
              <div className="space-y-4 p-4 border border-dashed border-red-400 rounded-lg">
                <h3 className="font-bold text-lg">Dev Controls</h3>
                <div className="space-y-2">
                  <h4 className="font-semibold">Photo Slot</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={meta.photoSlot.x} onChange={e => setMeta({ ...meta, photoSlot: { ...meta.photoSlot, x: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.photoSlot.y} onChange={e => setMeta({ ...meta, photoSlot: { ...meta.photoSlot, y: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.photoSlot.width} onChange={e => setMeta({ ...meta, photoSlot: { ...meta.photoSlot, width: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.photoSlot.height} onChange={e => setMeta({ ...meta, photoSlot: { ...meta.photoSlot, height: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Text Slot</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={meta.textSlot.x} onChange={e => setMeta({ ...meta, textSlot: { ...meta.textSlot, x: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.textSlot.y} onChange={e => setMeta({ ...meta, textSlot: { ...meta.textSlot, y: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.textSlot.width} onChange={e => setMeta({ ...meta, textSlot: { ...meta.textSlot, width: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                    <input value={meta.textSlot.height} onChange={e => setMeta({ ...meta, textSlot: { ...meta.textSlot, height: +e.target.value }})} type="number" className="w-full border-slate-300 rounded-lg" />
                  </div>
                </div>
                <button onClick={handleSaveTemplate} className="btn btn-primary w-full mt-4">Save Template</button>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">Teacher's Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter name (e.g., Mrs. Eleanor Vance)"
                value={name}
                onChange={e => setName(e.target.value.slice(0, 50))}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mt-2 mb-2">Phone Number (optional)</label>
              <input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={e => setPhone(e.target.value.slice(0, 20))}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>


            {/* Photo upload UI disabled for now. Keep markup here (wrapped in false) so it can be re-enabled later. */}
            {false && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload Photo (Optional)</label>
                <div className="flex items-center gap-4">
                  <input id="photo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)} className="hidden" />
                  <label htmlFor="photo-upload" className="btn btn-primary bg-slate-600 hover:bg-slate-700 cursor-pointer text-sm py-2 px-4">
                    Choose File
                  </label>
                  {photoPreview && <img src={photoPreview || undefined} alt="Preview" className="w-16 h-16 rounded-full object-cover"/>}
                  {photo && <button onClick={() => setPhoto(null)} className="text-red-500 hover:text-red-700"><Icon path="M6 18L18 6M6 6l12 12" /></button>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Choose a Template</label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(templates).map(([key, { name, src }]) => (
                  <div key={key} onClick={() => setSelectedTemplate(key as any)} className={`rounded-lg overflow-hidden border-4 cursor-pointer transition ${selectedTemplate === key ? 'border-blue-500' : 'border-transparent hover:border-blue-200'}`}>
                    <img src={src} alt={name} className="w-full h-auto object-cover"/>
                    <p className="text-center text-sm p-2 bg-slate-100">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="card p-4 relative aspect-w-4 aspect-h-3">
              {loading && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-2xl">
                  <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-lg font-semibold text-slate-700">Generating your card...</p>
                </div>
              )}
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative text-center" role="alert">{error}</div>}

            <div className="card p-6 flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <button onClick={() => onGenerate()} disabled={loading || !name} className="btn btn-primary w-full sm:w-auto flex-grow sm:flex-grow-0 disabled:bg-slate-400 disabled:shadow-none disabled:transform-none">
                <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="inline-block mr-2"/>
                Download
              </button>
              <button onClick={() => share('whatsapp')} disabled={loading || !name} className="btn bg-green-500 hover:bg-green-600 w-full sm:w-auto flex-grow sm:flex-grow-0 disabled:bg-slate-400">
                <Icon path="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" className="inline-block mr-2"/>
                Share on WhatsApp
              </button>
              <button onClick={() => share('email')} disabled={loading || !name} className="btn bg-gray-500 hover:bg-gray-600 w-full sm:w-auto flex-grow sm:flex-grow-0 disabled:bg-slate-400">
                <Icon path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" className="inline-block mr-2"/>
                Share via Email
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Editor;