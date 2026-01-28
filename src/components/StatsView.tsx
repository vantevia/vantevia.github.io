
import { useMemo, useState } from 'react';
import { getTierStyles, TIER_ORDER } from '../utils';

const MetricRow = ({ l, v, c, p, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between py-1.5 px-3 group rounded-none ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
  >
    <span className={`text-lg md:text-xl font-bold transition-colors ${onClick ? 'group-hover:text-white' : ''} text-gray-300 flex items-center gap-1`}>
      <span className="capitalize">{l}</span>:
      <span className={`text-${c || 'white'} font-black text-2xl md:text-3xl ml-2`}>{v}</span>
    </span>
    {p !== undefined && <span className="text-sm md:text-base text-slate-500 font-mono font-bold">({p.toFixed(0)}%)</span>}
  </div>
);

export const StatsView = ({ songs, isCapturing, onSetSettings, onNavTo }: any) => {
  const [showTopArtists, setShowTopArtists] = useState(false);

  const { stats, top, maxT } = useMemo(() => {
    const acc = { t: 0, bt: {} as any, ba: {} as any, ty: { Vocal: 0, Instrumental: 0 } };
    
    for (const x of songs) {
      if (x.isSeparator) continue;
      acc.t++;
      if (x.tier) acc.bt[x.tier] = (acc.bt[x.tier] || 0) + 1;
      acc.ba[x.artist] = (acc.ba[x.artist] || 0) + 1;
      acc.ty[x.type as 'Vocal' | 'Instrumental'] = (acc.ty[x.type as 'Vocal' | 'Instrumental'] || 0) + 1;
    }

    return {
      stats: acc,
      maxT: Math.max(...Object.values(acc.bt) as number[], 1),
      top: Object.entries(acc.ba).sort((a: any, b: any) => b[1] - a[1]).slice(0, 50)
    };
  }, [songs]);

  const navFilter = (key: string, val: string) => {
    onSetSettings(key, val);
    onNavTo('visual');
  };

  return (
    <div className={`w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 rounded-none ${isCapturing ? 'p-3' : ''}`}>
      <div className="bg-slate-900/40 border border-slate-700/50 p-6 shadow-lg space-y-1">
        <MetricRow l="Songs" v={stats.t} />
        <MetricRow l="Vocal" v={stats.ty.Vocal} c="pink-400" p={(stats.ty.Vocal / stats.t) * 100} onClick={() => navFilter('songTypeFilter', 'Vocal')} />
        <MetricRow l="Instrumental" v={stats.ty.Instrumental} c="blue-400" p={(stats.ty.Instrumental / stats.t) * 100} onClick={() => navFilter('songTypeFilter', 'Instrumental')} />
        <MetricRow l="Unique Artists" v={Object.keys(stats.ba).length} c="purple-400" onClick={() => setShowTopArtists(!showTopArtists)} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-slate-900/40 border border-slate-700/50 p-5 shadow-lg">
          <h3 className="text-lg font-black mb-4 border-b border-slate-700/50 pb-2 tracking-tight text-slate-300">Tier Distribution</h3>
          <div className="space-y-2">
            {TIER_ORDER.map(t => {
              const count = stats.bt[t] || 0;
              if (count === 0 && !isCapturing) return null;
              const st = getTierStyles(t);
              return (
                <div key={t} onClick={() => navFilter('tierFilter', t)} className="flex items-center gap-3 group/tier cursor-pointer hover:bg-white/5 p-0.5 transition-colors">
                  <div className="w-10 text-right font-black text-xl md:text-2xl" style={st.textStyle}>{t}</div>
                  <div className="flex-1 h-7 bg-slate-800/50 relative flex items-center overflow-hidden">
                    <div className="h-full absolute left-0 top-0 transition-all duration-1000" style={{ width: `${(count / maxT) * 100}%`, ...st.backgroundStyle, opacity: 0.85 }} />
                    <span className="relative z-10 ml-3 text-base md:text-lg font-black text-white drop-shadow-lg">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(showTopArtists || isCapturing) && (
          <div className="bg-slate-900/40 border border-slate-700/50 p-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-3">
              <h3 className="text-xl font-black text-slate-300">Top Artists</h3>
              {!isCapturing && <button onClick={() => setShowTopArtists(false)} className="text-[10px] font-bold tracking-widest text-slate-500 hover:text-white transition-colors">Close</button>}
            </div>
            <div className={`grid grid-cols-1 gap-y-3 ${!isCapturing ? 'max-h-[500px] overflow-y-auto pr-3 custom-scrollbar' : ''}`}>
              {top.map(([a, count]: any, i: number) => (
                <div key={a} className="flex items-center justify-between text-base font-bold group border-b border-slate-800/40 pb-1.5">
                  <span className="truncate pr-4 text-gray-300 group-hover:text-white transition-colors">
                    <span className="text-slate-500 mr-3 w-6 inline-block text-right font-mono text-xs">{i + 1}.</span> {a}
                  </span>
                  <span className="text-sky-400 font-black text-xl">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
