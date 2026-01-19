import { useState, useEffect, useCallback } from 'react';

// --- 1. THE HOOK ---
declare const html2canvas: any;

export const useScreenshot = () => {
  const [status, setStatus] = useState<'save' | 'copy' | null>(null);

  const capture = useCallback(async (el: HTMLElement | null, act: 'save' | 'copy', name = 'screenshot.png', scale = 1) => {
    if (!el) return;
    setStatus(act);
    
    // 1. Force the browser to confirm fonts are usable
    await document.fonts.ready;
    
    // 2. Scroll to top to prevent "sinking" coordinates
    const scrollPos = window.scrollY;
    window.scrollTo(0, 0);
    
    // 3. Give it a long buffer to ensure GitHub Pages assets are painted
    await new Promise(r => setTimeout(r, 800));

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
        // --- THE "REBUILD FROM SCRATCH" CLONE FIX ---
        onclone: (clonedDoc: any) => {
          // Find every wide grid card in the clone
          const cards = clonedDoc.querySelectorAll('.group.relative.w-full');
          
          cards.forEach((card: any) => {
            // Find the text content container
            const textContent = card.querySelector('.flex-1.flex.justify-between.items-center');
            if (textContent) {
              // 1. Kill the failing flex centering
              textContent.style.display = 'grid';
              textContent.style.gridTemplateColumns = '1fr auto';
              textContent.style.alignContent = 'center'; // Bulletproof Grid Centering
              textContent.style.height = '100%';
              textContent.style.paddingTop = '0px';
              textContent.style.paddingBottom = '0px';
              textContent.style.marginTop = '0px';
              textContent.style.marginBottom = '0px';

              // 2. Fix the Title/Rank block
              const titleBlock = textContent.querySelector('.flex-col');
              if (titleBlock) {
                titleBlock.style.display = 'flex';
                titleBlock.style.flexDirection = 'column';
                titleBlock.style.justifyContent = 'center';
                titleBlock.style.gap = '2px';
                
                // Align Rank and Title text baselines
                const headingRow = titleBlock.querySelector('.flex.items-center');
                if (headingRow) {
                  headingRow.style.display = 'flex';
                  headingRow.style.alignItems = 'baseline';
                  headingRow.style.gap = '12px';
                  
                  // Reset line-heights to prevent decapatition
                  const textElements = headingRow.querySelectorAll('h3, span');
                  textElements.forEach((t: any) => {
                    t.style.lineHeight = '1.2';
                    t.style.padding = '0';
                    t.style.margin = '0';
                  });
                }
              }

              // 3. Fix the Tier Block (S+)
              const tierBlock = textContent.querySelector('.border-l');
              if (tierBlock) {
                tierBlock.style.display = 'flex';
                tierBlock.style.flexDirection = 'column';
                tierBlock.style.justifyContent = 'center';
                tierBlock.style.height = '100%';
                tierBlock.style.alignItems = 'center';
              }
            }
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
              alert('Copy failed. Try Download.');
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