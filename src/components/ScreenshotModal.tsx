
import { useState, useEffect, useCallback } from 'react';

// --- 1. THE HOOK (formerly useScreenshot.ts) ---
declare const html2canvas: any;

export const useScreenshot = () => {
  const [status, setStatus] = useState<'save' | 'copy' | null>(null);

  const capture = useCallback(async (el: HTMLElement | null, act: 'save' | 'copy', name = 'screenshot.png', scale = 1) => {
    setStatus(act);
    await new Promise(r => setTimeout(r, 450)); // Wait for render
    if (!el) return setStatus(null);

    try {
      const canvas = await html2canvas(el, {
        useCORS: true, allowTaint: true, backgroundColor: "#0f172a",
        scale, logging: false, scrollX: -window.scrollX, scrollY: -window.scrollY, removeContainer: true
      });

      if (act === 'save') {
        const link = document.createElement('a'); link.download = name;
        link.href = canvas.toDataURL('image/png', 1.0); link.click();
      } else {
        canvas.toBlob(async (blob: any) => {
          try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('Copied to clipboard!'); }
          catch { alert('Copy failed. Use download.'); }
        }, 'image/png', 1.0);
      }
    } catch (e) { console.error(e); alert('Capture failed.'); } 
    finally { setStatus(null); }
  }, []);

  return { isCapturing: !!status, isSaving: status === 'save', isCopying: status === 'copy', capture };
};

// --- 2. THE MODAL COMPONENT ---
const Field = ({ label, val, set, min, max, cur, sub, step = "1" }: any) => (
  <div className="space-y-2 rounded-none">
    <div className="flex justify-between text-sm font-semibold text-gray-300 rounded-none"><span>{label}</span><span className="text-sky-400">{cur}</span></div>
    <input type="number" min={min} max={max} step={step} value={val} onChange={e => set(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-none p-3 text-white focus:outline-none focus:border-sky-500 transition-all" />
    <p className="text-xs text-slate-500 rounded-none">{sub}</p>
  </div>
);

export const ScreenshotModal = ({ isOpen, onClose, onConfirm, action, maxEntries }: any) => {
  const [scale, setScale] = useState('1'); const [limit, setLimit] = useState('');

  useEffect(() => { if (isOpen) { setScale('1'); setLimit(maxEntries ? maxEntries.toString() : ''); } }, [isOpen, maxEntries]);
  if (!isOpen) return null;

  const confirm = () => { const l = parseInt(limit); onConfirm(Math.min(1, parseFloat(scale) || 1), !isNaN(l) && l > 0 ? l : undefined); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 rounded-none">
      <div className="bg-slate-900 border border-slate-700 rounded-none shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-white mb-1 tracking-tight rounded-none">Capture Settings</h3>
        <p className="text-sm text-slate-400 mb-6 font-medium rounded-none">Configure screenshot options.</p>
        <div className="space-y-6 rounded-none">
          <Field label="Scale (Max 1.0)" val={scale} set={setScale} min="0.1" max="1" step="0.1" cur={`${scale}x`} sub="Higher scale improves quality." />
          {maxEntries !== undefined && <Field label="Entries to Capture" val={limit} set={setLimit} min="1" max={maxEntries} cur={limit || 'All'} sub="Limit number of items." />}
          <div className="flex gap-3 pt-2 rounded-none">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-none font-bold text-xs border border-slate-700">Cancel</button>
            <button onClick={confirm} className={`flex-1 px-4 py-2.5 rounded-none font-bold text-xs text-white ${action === 'save' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{action === 'save' ? 'Download' : 'Copy'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
