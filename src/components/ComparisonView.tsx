
import React, { useState, useEffect, useMemo } from 'react';
import { Song, downloadCsv, TIER_ORDER, getTierStyles } from '../utils';
import { SongItem } from './SongItem';

export const ComparisonView: React.FC<{ allSongs: Song[]; isCapturing?: boolean }> = ({ allSongs, isCapturing }) => {
    const [tiers, setTiers] = useState(new Set(TIER_ORDER));
    const [f, setF] = useState({ legacy: false, unranked: false, hide: true });
    const [history, setHistory] = useState<any[]>([]);
    const [pair, setPair] = useState<[Song, Song] | null>(null);

    const pool = useMemo(() => allSongs.filter(s => 
        !s.isSeparator && 
        (f.legacy || !s.isLegacy) && 
        (f.unranked || !s.isUnranked) && 
        (s.isLegacy || s.isUnranked || tiers.has(s.tier))
    ), [allSongs, f, tiers]);

    const next = () => {
        if (pool.length < 2) return setPair(null);
        const i1 = Math.floor(Math.random() * pool.length);
        const i2 = (i1 + Math.floor(Math.random() * (pool.length - 1)) + 1) % pool.length;
        setPair([pool[i1], pool[i2]]);
    };

    useEffect(() => {
        if (!pair && pool.length >= 2) next();
    }, [pool, pair]);

    const choose = (i: number) => {
        if (!pair) return;
        setHistory([{ w: pair[i], l: pair[i === 0 ? 1 : 0] }, ...history]);
        next();
    };

    if (pool.length < 2) {
        return (
            <div className="mx-auto p-8 text-center bg-slate-900/40 rounded-none border border-slate-700/50">
                <h2 className="text-xl font-bold text-gray-300">Not enough songs available</h2>
                <div className="mt-4 flex gap-2 justify-center rounded-none">
                    <button onClick={() => setF({ ...f, legacy: true })} className="px-4 py-2 bg-slate-800 rounded-none text-sm hover:bg-slate-700">Include Legacy</button>
                    <button onClick={() => setTiers(new Set(TIER_ORDER))} className="px-4 py-2 bg-slate-800 rounded-none text-sm hover:bg-slate-700">Select All Tiers</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-12 rounded-none">
            {!isCapturing && (
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-none p-4 flex flex-col gap-4 text-center">
                    <div className="flex flex-wrap gap-2 justify-center rounded-none">
                        {TIER_ORDER.map(t => (
                            <button 
                                key={t} 
                                onClick={() => { const n = new Set(tiers); n.has(t) ? n.delete(t) : n.add(t); setTiers(n); }} 
                                className={`px-2 py-1 text-xs font-bold rounded-none border ${tiers.has(t) ? 'bg-sky-600/20 border-sky-500/50 text-sky-200' : 'bg-slate-800 border-slate-700 text-gray-500'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-4 justify-center border-t border-slate-700/50 pt-3 text-sm text-gray-300 rounded-none">
                        {[
                            { k: 'legacy', l: 'Include Legacy' },
                            { k: 'unranked', l: 'Include Unranked' },
                            { k: 'hide', l: 'Hide Ranks' }
                        ].map(item => (
                            <label key={item.k} className="flex items-center gap-2 cursor-pointer rounded-none">
                                <input type="checkbox" checked={(f as any)[item.k]} onChange={e => setF({ ...f, [item.k]: e.target.checked })} className="accent-sky-500 rounded-none" />
                                {item.l}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {pair && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 min-h-[300px] rounded-none">
                    {[0, 1].map(i => {
                        const s = pair[i];
                        return (
                            <React.Fragment key={i}>
                                <div className="flex-1 w-full max-w-lg hover:scale-[1.02] transition-transform rounded-none">
                                    <SongItem 
                                        variant="grid" 
                                        isCompact 
                                        song={{ ...s, rank: (f.hide || s.isLegacy || s.isUnranked) ? null : s.rank }} 
                                        onClick={() => choose(i)} 
                                        hideTierText={f.hide} 
                                        showArtist 
                                    />
                                </div>
                                {i === 0 && (
                                    <div className="flex flex-col items-center gap-2 shrink-0 rounded-none">
                                        <div className="w-12 h-12 rounded-none bg-slate-800 border-2 border-slate-600 flex items-center justify-center font-black text-gray-400 italic text-sm shadow-xl">VS</div>
                                        <button onClick={next} className="px-3 py-1 bg-slate-800 text-gray-400 text-xs rounded-none border border-slate-700 hover:bg-slate-700">Skip</button>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 rounded-none">
                <div className="flex justify-between mb-4 px-2 font-bold text-white rounded-none">
                    <h3>History ({history.length})</h3>
                    {history.length > 0 && (
                        <button onClick={() => downloadCsv('history.csv', ['Winner', 'Loser'], history.map(h => [h.w.title, h.l.title]))} className="text-sm text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-none border border-emerald-900/50 hover:bg-emerald-900/40">Export CSV</button>
                    )}
                </div>
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-none overflow-hidden text-sm text-gray-400">
                    <table className="w-full text-left rounded-none">
                        <thead className="bg-slate-800 text-xs font-bold rounded-none">
                            <tr><th className="px-4 py-3">Winner</th><th className="px-4 py-3">Loser</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 rounded-none">
                            {history.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-800/30 rounded-none">
                                    {[h.w, h.l].map((s, si) => (
                                        <td key={si} className="px-4 py-3 rounded-none">
                                            <div className="flex items-baseline gap-2 rounded-none">
                                                <span style={getTierStyles(s.tier).textStyle} className="font-bold shrink-0">{s.tier}</span>
                                                <b className="text-white truncate">{s.title}</b>
                                            </div>
                                            <div className="text-xs opacity-50 ml-8 rounded-none">{s.artist}</div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!history.length && <p className="p-8 text-center italic opacity-30 rounded-none">No comparisons made yet.</p>}
                </div>
            </div>
        </div>
    );
};
