
import { useMemo } from 'react';
import { getTierStyles, TIER_ORDER } from '../utils';

export const StatsView = ({ songs, isCapturing }: any) => {
  const s = useMemo(() => {
    const r: any = { t: 0, bt: {}, ba: {}, ty: { Vocal: 0, Instrumental: 0 } };
    songs.forEach((x: any) => {
      if (x.isSeparator) return;
      r.t++; r.bt[x.tier] = (r.bt[x.tier] || 0) + 1; r.ba[x.artist] = (r.ba[x.artist] || 0) + 1; r.ty[x.type] = (r.ty[x.type] || 0) + 1;
    });
    return { ...r, top: Object.entries(r.ba).sort((a: any, b: any) => b[1] - a[1]).slice(0, 50) };
  }, [songs]);

  const maxT = Math.max(...Object.values(s.bt) as number[], 1), maxA = s.top[0]?.[1] || 1;
  const Card = ({ l, v, c, p }: any) => <div className="bg-slate-900/40 border border-slate-700/50 p-6 rounded-xl flex flex-col items-center justify-center shadow-lg"><span className="text-slate-400 text-[10px] font-bold tracking-widest">{l}</span><span className={`text-3xl md:text-4xl font-black mt-2 text-${c || 'white'}`}>{v}</span>{p && <span className="text-xs text-slate-500 mt-1 font-mono">{(v / s.t * 100).toFixed(1)}%</span>}</div>;

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 ${isCapturing ? 'p-4' : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card l="Total Songs" v={s.t} /> <Card l="Unique Artists" v={Object.keys(s.ba).length} c="purple-400" />
        <Card l="Vocal" v={s.ty.Vocal} c="pink-400" p /> <Card l="Instrumental" v={s.ty.Instrumental} c="blue-400" p />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-700/50 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-6 border-b border-slate-700/50 pb-2">Tier Distribution</h3>
          <div className="space-y-3">{TIER_ORDER.map(t => {
            const c = s.bt[t] || 0; if (c === 0 && !isCapturing) return null; const st = getTierStyles(t);
            return (
              <div key={t} className="flex items-center gap-4"><div className="w-12 text-right font-black text-lg" style={st.textStyle}>{t}</div>
                <div className="flex-1 h-8 bg-slate-800/50 rounded-r-lg relative flex items-center overflow-hidden"><div className="h-full absolute left-0 top-0" style={{ width: `${(c / maxT) * 100}%`, ...st.backgroundStyle, opacity: 0.8 }} /><span className="relative z-10 ml-3 text-sm font-bold text-white shadow-black drop-shadow-md">{c}</span></div>
              </div>
            );
          })}</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-700/50 p-6 rounded-xl shadow-lg h-full max-h-[800px] flex flex-col">
          <h3 className="text-lg font-bold mb-6 border-b border-slate-700/50 pb-2">Top Artists</h3>
          <div className={`space-y-4 ${!isCapturing && 'overflow-y-auto pr-2 custom-scrollbar flex-1'}`}>{s.top.map(([a, c]: any, i: number) => (
            <div key={a} className="flex flex-col gap-1 group"><div className="flex justify-between text-sm font-semibold text-gray-300"><span className="truncate pr-2 group-hover:text-white"><span className="text-slate-500 mr-2 w-5 inline-block text-right">{i + 1}.</span> {a}</span><span className="text-sky-400 font-bold">{c}</span></div><div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-600 group-hover:bg-sky-400 transition-all" style={{ width: `${(c / maxA) * 100}%` }} /></div></div>
          ))}</div>
        </div>
      </div>
    </div>
  );
};
