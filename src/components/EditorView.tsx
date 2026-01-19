import React, { useState, useEffect } from 'react';
import { RawSong } from '../utils';
import { saveSongData, appendChangelog } from '../utils';

export const EditorView: React.FC<{ songs: RawSong[]; onSaveSuccess: () => void }> = ({ songs, onSaveSuccess }) => {
    const [localSongs, setLocalSongs] = useState<RawSong[]>([]);
    const [log, setLog] = useState<any[]>([]);
    const [hist, setHist] = useState<any[]>([]);
    const [hIdx, setHIdx] = useState(-1);
    const [ui, setUi] = useState({ saving: false, err: null as string | null, msg: null as string | null, auto: false, last: null as string | null });

    const cl = (a: any[]) => JSON.parse(JSON.stringify(a));
    const getTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    useEffect(() => {
        if (songs?.length && hIdx === -1) {
            const s = cl(songs).sort((a, b) => ((a.isUnranked || !a.isMain) ? 9e5 : a.rank) - ((b.isUnranked || !b.isMain) ? 9e5 : b.rank));
            setLocalSongs(s); setHist([{ s, l: [] }]); setHIdx(0);
        }
    }, [songs]);

    const push = (s: RawSong[], l = log) => {
        const nH = hist.slice(0, hIdx + 1);
        nH.push({ s: cl(s), l: cl(l) });
        setHist(nH); setHIdx(nH.length - 1); setLocalSongs(s); setLog(l);
    };

    const commit = (txt: string, s: RawSong[]) => {
        setUi(p => ({ ...p, last: txt }));
        if (ui.auto) push(s, [{ id: Math.random(), text: `${getTime()}: ${txt}` }, ...log]);
        else push(s);
    };

    const undo = () => {
        if (hIdx > 0) {
            const p = hist[hIdx - 1];
            setHIdx(hIdx - 1);
            setLocalSongs(cl(p.s));
            setLog(cl(p.l));
            setUi(p => ({ ...p, last: "Undid action" }));
        }
    };

    const save = async () => {
        setUi(p => ({ ...p, saving: true, err: null, msg: null }));
        try {
            await saveSongData(localSongs);
            if (log.length) await appendChangelog([...log].reverse().map(x => x.text));
            setUi(p => ({ ...p, msg: "Data successfully saved!", saving: false }));
            setTimeout(onSaveSuccess, 1500);
        } catch (e: any) { setUi(p => ({ ...p, err: e.message, saving: false })); }
    };

    const handleRankMove = (title: string, newRankVal: string) => {
        const r = parseInt(newRankVal);
        const n = [...localSongs];
        const curIdx = n.findIndex(s => s.title === title);
        if (curIdx === -1 || isNaN(r) || r < 1 || r > n.length || r === curIdx + 1) return setLocalSongs(cl(n));

        const oldRank = curIdx + 1;
        const [song] = n.splice(curIdx, 1);
        n.splice(r - 1, 0, song);
        const updated = n.map((s, idx) => ({ ...s, rank: idx + 1 }));
        commit(`${song.title} moved from #${oldRank} to #${r}`, updated);
    };

    const updProp = (title: string, field: keyof RawSong, value: any) => {
        const n = [...localSongs];
        const idx = n.findIndex(s => s.title === title);
        if (idx === -1) return;
        n[idx] = { ...n[idx], [field]: value };
        push(n);
    };

    const COLUMNS = [
        { h: '#', w: 'w-24', f: 'rank' },
        { h: 'SONG', w: 'min-w-[300px]', f: 'title', b: true },
        { h: 'ARTIST', w: 'min-w-[200px]', f: 'artist' },
        { h: 'REMIXER', w: 'min-w-[150px]', f: 'remixer' },
        { h: 'INST/VOCAL', w: 'min-w-[150px]', f: 'type', o: ['Vocal', 'Instrumental'] },
        { h: 'Date Added', w: 'min-w-[140px]', f: 'dateAdded' },
        { h: 'TIER', w: 'min-w-[150px]', f: 'tier', o: ['S+', 'S', 'A++', 'A+', 'A', 'A-', 'B+', 'B', 'B-'] },
        { h: 'MAIN', w: 'min-w-[120px]' },
        { h: 'BACKGROUND', w: 'min-w-[120px]', f: 'backgroundColor' },
        { h: 'DURATION', w: 'w-28', f: 'duration' },
        { h: 'LINK', w: 'min-w-[250px]', f: 'link' },
        { h: 'IMAGE', w: 'min-w-[250px]', f: 'imageUrl' }
    ];

    return (
        <div className="w-full max-w-[98vw] mx-auto bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                    <div><h2 className="text-2xl font-bold text-white">Data Editor</h2><p className="text-sm text-slate-400">Editing {localSongs.length} entries.</p></div>
                    {hIdx > 0 && <button onClick={undo} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-bold border border-slate-600 transition-colors">↩ Undo</button>}
                </div>
                <button onClick={save} disabled={ui.saving} className={`px-6 py-2 text-white font-bold rounded shadow-lg ${ui.saving ? 'bg-sky-700' : 'bg-sky-600 hover:bg-sky-500'}`}>Save to Sheets</button>
            </div>

            {(ui.err || ui.msg) && <div className={`px-6 py-2 border-b font-medium ${ui.err ? 'bg-red-900/50 text-red-200 border-red-800/50' : 'bg-emerald-900/50 text-emerald-200 border-emerald-800/50'}`}>{ui.err || ui.msg}</div>}

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[2100px]">
                        <thead className="bg-slate-800 sticky top-0 z-20 shadow-md">
                            <tr>{COLUMNS.map(c => <th key={c.h} className={`p-3 border-r border-slate-700 text-center text-gray-300 uppercase text-sm font-bold tracking-wider ${c.w}`}>{c.h}</th>)}</tr>
                        </thead>
                        <tbody className="text-gray-200 divide-y divide-slate-800">
                            {localSongs.map((s) => (
                                <tr key={s.title} className="hover:bg-slate-800/40 transition-colors">
                                    {COLUMNS.map(c => (
                                        <td key={c.h} className="p-1 border-r border-slate-800 align-middle">
                                            {c.h === '#' ? (
                                                (s.isUnranked || !s.isMain) ? <span className="block text-center text-slate-600 font-bold">-</span> : 
                                                <input key={s.title + s.rank} type="text" inputMode="numeric" defaultValue={s.rank}
                                                    onBlur={e => handleRankMove(s.title, e.target.value)} 
                                                    onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()} 
                                                    className="w-full bg-transparent text-center font-mono font-bold text-sky-400 outline-none" 
                                                />
                                            ) : c.h === 'MAIN' ? (
                                                <select value={s.isMain ? 'Y' : s.isUnranked ? 'U' : 'N'} 
                                                    onChange={e => { 
                                                        const v = e.target.value as any, n = [...localSongs], idx = n.findIndex(x => x.title === s.title);
                                                        n[idx] = { ...n[idx], isMain: v === 'Y', isUnranked: v === 'U' };
                                                        commit(`${s.title} status: ${v}`, n.map((q, qidx) => ({ ...q, rank: qidx + 1 })));
                                                    }} 
                                                    className={`w-full bg-transparent p-2 outline-none font-bold text-center ${s.isMain ? 'text-green-400' : s.isUnranked ? 'text-yellow-400' : 'text-slate-500'}`}
                                                >
                                                    <option value="Y" className="bg-slate-800 text-green-400">Y</option><option value="N" className="bg-slate-800 text-slate-400">N</option><option value="U" className="bg-slate-800 text-yellow-400">U</option>
                                                </select>
                                            ) : c.o ? (
                                                <select value={(s as any)[c.f!] || ''} onChange={e => updProp(s.title, c.f as any, e.target.value)} className="w-full bg-transparent p-2 outline-none text-center">
                                                    {c.o.map(o => <option key={o} value={o} className="bg-slate-800">{o}</option>)}
                                                </select>
                                            ) : (
                                                <input key={s.title + (s as any)[c.f!]} type="text" defaultValue={(s as any)[c.f!] || ''} 
                                                    onBlur={(e) => { if(e.target.value !== (s as any)[c.f!]) updProp(s.title, c.f as any, e.target.value); }} 
                                                    onKeyDown={e => e.key === 'Enter' && (e.target as any).blur()} 
                                                    className={`w-full bg-transparent p-2 outline-none ${c.b ? 'font-bold text-white' : ''} ${c.h === 'DURATION' || c.h === 'Date Added' ? 'text-center' : ''}`} 
                                                />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="w-96 border-l border-slate-700 bg-slate-800/30 flex flex-col shrink-0">
                    <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-300 uppercase tracking-wider">Session Log</span>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-sky-400 font-bold"><input type="checkbox" checked={ui.auto} onChange={e => setUi({ ...ui, auto: e.target.checked })} className="accent-sky-500" /> Auto-log</label>
                    </div>
                    <div className="p-3 bg-slate-900/50 border-b border-slate-700/50">
                        <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-slate-500 uppercase">Last Change</span>{!ui.auto && ui.last && <button onClick={() => push(localSongs, [{ id: Date.now(), text: `${getTime()}: ${ui.last}` }, ...log])} className="text-[10px] bg-sky-600/30 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30 font-bold transition-colors hover:bg-sky-600/50">Add to Log</button>}</div>
                        <div className="text-xs text-slate-300 font-mono break-words">{ui.last || <span className="text-slate-600 italic">No recent changes</span>}</div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 space-y-3">{log.map(l => <div key={l.id} className="text-sm text-white border-b border-slate-700/50 pb-2 font-mono">{l.text}</div>)}</div>
                </div>
            </div>
        </div>
    );
};