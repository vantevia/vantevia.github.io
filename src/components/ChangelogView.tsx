import { useState, useMemo } from 'react';
import { normalizeTitle as nt, getCompositeKey as gk } from '../utils';
import { SongItem } from './SongItem';

export const ChangelogView = ({ list, changelog: cl, historyPoint: hp, isCapturing: ic, onSongClick: osc, onSetHistoryPoint: shp, layoutMode: lm, showArtist: sa, hideTierText: ht, showVisualMetadata: svm, ...m }: any) => {
  const [mode, setMode] = useState('list'), ts = new Date(hp).getTime();

  const logs = useMemo(() => {
    let l: any[] = [], logs: any[] = [], lTs = -1;
    const rel = (i: number) => { const a = l[i-2]?.title, b = l[i]?.title; return a&&b?`above ${b} and below ${a}`:a?`below ${a}`:b?`above ${b}`:''; };

    for (const e of cl.filter((x: any) => x.timestamp <= ts)) {
      const ta = e.artist || m.titleToArtistMap.get(nt(e.song)) || 'N/A', k = gk(e.song, ta);
      const s: any = { title: e.song, artist: m.artistMap.get(k)||ta };
      
      let msg = '', tIdx = Math.max(0, Math.min(l.length, e.new - 1));
      
      if (e.type === 'Snapshot' && e.new > 0) {
        if (lTs !== e.timestamp) { l = []; lTs = e.timestamp; }
        l = l.filter(x => gk(x.title, x.artist) !== k); l.splice(tIdx, 0, s);
      } else if (e.type === 'Placement' && e.new > 0) {
        l = l.filter(x => gk(x.title, x.artist) !== k); l.splice(tIdx, 0, s);
        const r = rel(tIdx + 1); msg = `${e.song} was placed at #${tIdx + 1}${r ? `, ${r}` : ''}.`;
      } else if (e.type === 'Movement' && e.new > 0) {
        const sIdx = l.findIndex(x => gk(x.title, x.artist) === k);
        if (sIdx !== -1) {
          const [mv] = l.splice(sIdx, 1); l.splice(tIdx, 0, mv);
          const r = rel(tIdx + 1); msg = `${e.song} was moved from #${sIdx + 1} to #${tIdx + 1}${r ? `, ${r}` : ''}.`;
        }
      } else if (e.type === 'Removal') {
        const i = l.findIndex(x => gk(x.title, x.artist) === k); if (i !== -1) l.splice(i, 1);
        msg = `${e.song} was moved into the Legacy List.`;
      } else if (e.type === 'Swap') {
        const i = l.findIndex(x => gk(x.title, x.artist) === k);
        if (i > 0) { const o = l[i-1].title; [l[i], l[i-1]] = [l[i-1], l[i]]; msg = `${e.song} was swapped with ${o}, with ${e.song} now at #${i}.`; }
      }

      if (msg) logs.push({ text: msg, ...e });
      l = l.map((x, i) => ({ ...x, rank: i + 1 }));
    }
    return logs.reverse();
  }, [cl, ts, m]);

  const cfg: any = { compact: {v:'classic',i:true,w:'500px',g:'flex flex-col'}, grid: {v:'grid',i:true,w:'1280px',g:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}, standard: {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'} }[lm as string] || {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'};

  return (
    <div className="w-full flex flex-col gap-6">
      {!ic && <div className="flex bg-slate-900/60 p-1 border border-slate-800 self-center">
        {['list', 'log'].map(v => <button key={v} onClick={() => setMode(v)} className={`px-6 py-2 text-xs font-bold transition-all ${mode === v ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>{v === 'list' ? 'Time Machine' : 'Changelog'}</button>)}
      </div>}
      {mode === 'list' ? (
        <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!ic && <div className="flex items-center gap-4 bg-slate-950 p-2 border border-slate-700 shadow-inner">
            <div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-slate-500 ml-1">Target Date and Time</span><input type="datetime-local" value={hp} onChange={e => shp(e.target.value.replace('T', ' '))} className="bg-transparent border-none p-1 text-sm font-bold text-white focus:ring-0 outline-none w-52"/></div>
            <button onClick={() => shp(new Date().toISOString().slice(0, 16).replace('T', ' '))} className="px-3 py-2 bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 text-[11px] font-bold border border-sky-600/30 transition-all">Reset</button>
          </div>}
          <div className={`${cfg.g} w-full ${lm === 'grid' ? '' : `max-w-[${cfg.w}]`}`}>
            {list.map((s: any) => <SongItem key={`${s.title}-${s.rank}`} variant={cfg.v} song={s} onClick={() => osc(s)} isCompact={cfg.i} showArtist={sa} hideTierText={ht} showVisualMetadata={svm} />)}
            {!list.length && <div className="py-24 text-center border-2 border-dashed border-slate-800 text-slate-600 italic rounded-none w-full">No songs were active at this time.</div>}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 gap-4">{[{v:list.length,l:'Active Songs'},{v:logs.length,l:'Events Applied'}].map((x,i)=><div key={i} className="text-center p-4 bg-slate-900/40 border border-slate-800"><div className="text-3xl font-black text-white">{x.v}</div><div className="text-[11px] font-bold text-slate-500 mt-1">{x.l}</div></div>)}</div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3"><h3 className="text-lg font-bold text-slate-300">Changelog</h3><span className="text-[11px] font-bold text-slate-600">{logs.length} total events</span></div>
            <div className="w-full overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-none">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800"><tr><th className="p-4 w-40">Date</th><th className="p-4">Change</th></tr></thead>
                <tbody className="divide-y divide-slate-800/50">
                  {logs.map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-slate-500 whitespace-nowrap align-top">{m.date}</td>
                      <td className="p-4 text-slate-300 align-top leading-relaxed">{m.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!logs.length && <div className="p-8 text-center text-slate-500 italic">No recorded events prior to this point in history.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};