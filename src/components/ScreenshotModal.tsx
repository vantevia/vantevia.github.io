import { useState, useEffect, useCallback } from 'react';

// --- 1. THE HOOK ---
declare const html2canvas: any;

export const useScreenshot = () => {
  const [status, setStatus] = useState<'save' | 'copy' | null>(null);

  const capture = useCallback(async (el: HTMLElement | null, act: 'save' | 'copy', name = 'screenshot.png', scale = 1) => {
    if (!el) return;
    setStatus(act);
    
    // Scroll to top to ensure coordinates are relative to 0
    const scrollPos = window.scrollY;
    window.scrollTo(0, 0);
    
    // Wait for render/fonts
    await new Promise(r => setTimeout(r, 600));

    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0f172a",
        scale,
        logging: false,
        imageTimeout: 0,
        scrollX: 0,
        scrollY: 0,
        // --- THE ACTUAL FIX FOR VERTICAL CENTERING ---
        onclone: (clonedDoc: any) => {
          // 1. Target the main content wrapper
          const containers = clonedDoc.querySelectorAll('.flex-1.flex.justify-between.items-center');
          
          containers.forEach((container: any) => {
            // Force standard flex centering
            container.style.display = 'flex';
            container.style.flexDirection = 'row';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'space-between';
            container.style.height = '100%';
            
            // 2. Fix the text block (Title, Artist, Tags)
            // html2canvas often adds "leading" (space) to text which causes the sink.
            // We force line-height to 1 to strip that empty space.
            const textBlocks = container.querySelectorAll('.flex-col');
            textBlocks.forEach((block: any) => {
              block.style.display = 'flex';
              block.style.flexDirection = 'column';
              block.style.justifyContent = 'center';
              block.style.height = '100%';
              
              // Force baseline alignment for Title and Rank
              const titles = block.querySelectorAll('h3, span');
              titles.forEach((t: any) => {
                t.style.lineHeight = '1.1'; 
                t.style.display = 'inline-block';
              });
            });

            // 3. Fix the Tier Block (S+, etc) centering
            const tierBlocks = container.querySelectorAll('.border-l');
            tierBlocks.forEach((tier: any) => {
                tier.style.display = 'flex';
                tier.style.flexDirection = 'column';
                tier.style.justifyContent = 'center';
                tier.style.alignItems = 'center';
                tier.style.height = '100%';
            });
          });
        }
      });

      if (act === 'save') {
        const link = document.createElement('a'); 
        link.download = name;
        link.href = canvas.toDataURL('image/png', 1.0); 
        link.click();
      } else {
        canvas.toBlob(async (blob: any) => {
          if (blob) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              alert('Copied to clipboard!');
            } catch {
              alert('Copy failed. Use Download.');
            }
          }
        }, 'image/png', 1.0);
      }
    } catch (e) {
      console.error(e);
      alert('Capture failed.');
    } finally {
      window.scrollTo(0, scrollPos);
      setStatus(null);
    }
  }, []);

  return { isCapturing: !!status, isSaving: status === 'save', isCopying: status === 'copy', capture };
};

// --- 2. THE MODAL COMPONENT ---
const Field = ({ label, val, set, min, max, cur, sub, step = "1" }: any) => (
  <div className="space-y-2 rounded-none">
    <div className="flex justify-between text-sm font-semibold text-gray-300">
      <span>{label}</span>
      <span className="text-sky-400">{cur}</span>
    </div>
    <input 
      type="number" min={min} max={max} step={step} value={val} 
      onChange={e => set(e.target.value)} 
      className="w-full bg-slate-800 border border-slate-600 rounded-none p-3 text-white focus:outline-none focus:border-sky-500" 
    />
    <p className="text-xs text-slate-500">{sub}</p>
  </div>
);

export const ScreenshotModal = ({ isOpen, onClose, onConfirm, action, maxEntries }: any) => {
  const [scale, setScale] = useState('1'); 
  const [limit, setLimit] = useState('');

  useEffect(() => { 
    if (isOpen) { 
      setScale('1'); 
      setLimit(maxEntries ? maxEntries.toString() : ''); 
    } 
  }, [isOpen, maxEntries]);

  if (!isOpen) return null;

  const confirm = () => { 
    const l = parseInt(limit); 
    onConfirm(Math.min(1, parseFloat(scale) || 1), !isNaN(l) && l > 0 ? l : undefined); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-none shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-white mb-1 tracking-tight uppercase">Capture Settings</h3>
        <p className="text-sm text-slate-400 mb-6 font-medium">Configure screenshot options.</p>
        <div className="space-y-6">
          <Field label="Scale (Max 1.0)" val={scale} set={setScale} min="0.1" max="1" step="0.1" cur={`${scale}x`} sub="Higher scale improves quality." />
          {maxEntries !== undefined && <Field label="Entries to Capture" val={limit} set={setLimit} min="1" max={maxEntries} cur={limit || 'All'} sub="Limit number of items." />}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-none font-bold text-xs border border-slate-700 uppercase">Cancel</button>
            <button onClick={confirm} className={`flex-1 px-4 py-2.5 rounded-none font-bold text-xs uppercase text-white ${action === 'save' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
              {action === 'save' ? 'Download' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};