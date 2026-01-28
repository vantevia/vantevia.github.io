
import { useState } from 'react';
import { TIER_ORDER } from '../utils';

// --- HELPERS ---
const Tgl = ({ l, s, c, o, d }: any) => (
    <div className="flex items-center justify-between py-2">
        <span className={`text-sm font-semibold ${d ? 'text-gray-500' : 'text-gray-300'}`}>{l}{s && <span className="block text-[10px] font-normal text-gray-500">{s}</span>}</span>
        <button onClick={() => !d && o(!c)} className={`relative h-5 w-10 rounded-none transition ${c ? 'bg-sky-500' : 'bg-slate-700'} ${d ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}`}><span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-none bg-white transition ${c ? 'translate-x-5' : ''}`} /></button>
    </div>
);
const Sel = ({ l, v, o, opts }: any) => (
    <div className="flex flex-col gap-1 mt-3"><span className="text-sm text-gray-300 font-semibold">{l}</span><select value={v} onChange={e => o(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-none p-1.5 text-xs text-white outline-none focus:border-sky-500">{opts.map((op: any) => <option key={op.val} value={op.val}>{op.label}</option>)}</select></div>
);

export const Sidebar = (p: any) => {
    const { viewState: vs, settings: s, demonListType: dlt, uniqueArtists: art, onNavTo: nav, onSetDemonListType: setDlt, onSetSettings: setS } = p;
    const [open, setOpen] = useState(false);
    const btns: any = { visual: 'The Depths III', stats: 'Statistics', changelog: 'Changelog' };

    const NavBtn = ({ m, l, c = "sky" }: any) => (
        <button onClick={() => nav(m)} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${vs.active === m && !vs.selectedSong ? `border-${c}-500 text-white bg-${c}-500/10` : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>{l}</button>
    );

    const artOpts = [{ val: 'all', label: 'All Artists' }, ...(art || []).map((a: any) => ({ val: a, label: a }))];
    const tierOpts = [{ val: 'all', label: 'All Tiers' }, ...TIER_ORDER.map(t => ({ val: t, label: t }))];
    const displayToggles = [ { k: 'showArtist', l: 'Show Artist' }, { k: 'showVisualMetadata', l: 'Show Metadata', d: s.layoutMode !== 'standard' }, { k: 'showDetails', l: 'Show Details' }, { k: 'hideTierText', l: 'Hide Tier Text' }, { k: 'rankDisplayMode', l: 'Group Rank', v: s.rankDisplayMode === 'group', set: (v: any) => setS('rankDisplayMode', v ? 'group' : 'original'), d: s.songTypeFilter === 'all' && s.artistFilter === 'all' && s.sortMode === 'rank' } ];

    return (
        <nav className="w-full flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-900/40 border border-slate-700/50 rounded-none overflow-hidden">
                    {['visual', 'stats', 'changelog'].map(m => <NavBtn key={m} m={m} l={btns[m]} />)}
                    <div className="relative group">
                        <button onClick={() => { nav('demonlist'); if(!['main','extended','all'].includes(dlt)) setDlt('main'); }} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${vs.active === 'demonlist' ? 'border-sky-500 text-white bg-sky-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>Verified Levels</button>
                        {vs.active === 'demonlist' && <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 shadow-2xl flex flex-col z-[60]">{['Main', 'Extended', 'Full'].map(t => <button key={t} onClick={() => setDlt(t.toLowerCase() === 'full' ? 'all' : t.toLowerCase())} className={`w-40 text-left px-4 py-2 text-[10px] font-bold ${dlt === (t.toLowerCase()==='full'?'all':t.toLowerCase()) ? 'text-sky-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>{t} List</button>)}</div>}
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button onClick={() => setOpen(!open)} className={`px-4 py-2 text-xs font-bold rounded-none border transition-all ${open ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:text-slate-200'}`}>Settings</button>
                    {vs.selectedSong && (
                        <button onClick={p.onClearHistorySelection} className="px-4 py-2 text-xs font-bold rounded-none border transition-all bg-slate-800 border-slate-700 text-gray-300">
                            ← Back
                        </button>
                    )}
                </div>
            </div>

            {open && <div className="absolute top-full left-0 right-0 mt-2 z-50 px-4 md:px-8 max-h-[80vh] overflow-y-auto"><div className="max-w-[1600px] mx-auto bg-slate-950 border border-slate-800 shadow-2xl p-6 flex flex-col gap-6"><div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold tracking-widest text-sky-400">Settings</h3><button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">✕</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-1">Filtering</h3>
                        <div className="space-y-4">
                            <Tgl l="Show All Songs" s="Include removed/legacy" c={s.showAllSongs} o={(v: any) => setS('showAllSongs', v)} />
                            <Sel l="Sort Order" v={s.sortMode} o={(v: any) => setS('sortMode', v)} opts={[{ val: 'rank', label: 'By Rank' }, { val: 'title', label: 'Alphabetical' }, { val: 'date', label: 'Date Added' }]} />
                            <Sel l="Song Type" v={s.songTypeFilter} o={(v: any) => setS('songTypeFilter', v)} opts={[{ val: 'all', label: 'All Types' }, { val: 'Vocal', label: 'Vocal' }, { val: 'Instrumental', label: 'Instrumental' }]} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4"><h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-1">Display</h3>
                        <Sel l="Layout Mode" v={s.layoutMode} o={(v: any) => setS('layoutMode', v)} opts={[{ val: 'standard', label: 'Standard' }, { val: 'compact', label: 'Compact' }, { val: 'grid', label: 'Grid' }]} />
                        <div className="divide-y divide-slate-800/50 mt-2">{displayToggles.map((t: any) => <Tgl key={t.k} l={t.l} c={t.v ?? s[t.k]} o={t.set ?? ((v: any) => setS(t.k, v))} d={t.d} />)}</div>
                    </div>
                    <div className="flex flex-col gap-4"><h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-1">Misc and Capture</h3>
                        <Sel l="Tier" v={s.tierFilter} o={(v: any) => setS('tierFilter', v)} opts={tierOpts} /><Sel l="Artist" v={s.artistFilter} o={(v: any) => setS('artistFilter', v)} opts={artOpts} /><Sel l="Font" v={s.font} o={(v: any) => setS('font', v)} opts={['verdana', 'montserrat', 'orbitron'].map(f => ({ val: f, label: f[0].toUpperCase() + f.slice(1) }))} />
                        <div className="pt-4 space-y-2"><button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} className="w-full bg-slate-800 hover:bg-slate-700 text-gray-200 py-2 rounded-none font-semibold text-xs border border-slate-700 transition-colors">Toggle Fullscreen (F)</button><div className="flex gap-2"><button onClick={() => p.onRequestCapture('save')} disabled={p.isSaving || p.isCopying} className="flex-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-200 py-2 rounded-none font-semibold text-xs border border-sky-600/30 transition-colors disabled:opacity-50">{p.isSaving ? "..." : "Save (S)"}</button><button onClick={() => p.onRequestCapture('copy')} disabled={p.isSaving || p.isCopying} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 py-2 rounded-none font-semibold text-xs border border-emerald-600/30 transition-colors disabled:opacity-50">{p.isCopying ? "..." : "Copy (⇧C)"}</button></div></div>
                    </div>
                </div></div></div>}
        </nav>
    );
};
