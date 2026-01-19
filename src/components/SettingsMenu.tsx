
import { formatDate } from '../utils';

const Tgl = ({ l, c, o, d, s }: any) => (
    <div className="flex items-center justify-between py-2">
        <span className={`text-sm font-semibold ${d ? 'text-gray-500' : 'text-gray-300'}`}>{l}{s && <span className="block text-[10px] font-normal text-gray-500">{s}</span>}</span>
        <button onClick={() => !d && o(!c)} className={`relative h-5 w-10 rounded-full transition ${c ? 'bg-sky-500' : 'bg-slate-700'} ${d ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${c ? 'translate-x-5' : ''}`} />
        </button>
    </div>
);

const Sel = ({ l, v, o, opts }: any) => (
    <div className="flex flex-col gap-1 mt-3">
        <span className="text-sm text-gray-300 font-semibold">{l}</span>
        <select value={v} onChange={e => o(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-xs text-white outline-none focus:border-sky-500">
            {opts.map((opt: any) => <option key={opt.val ?? opt.value} value={opt.val ?? opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

const Btn = ({ l, a, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 px-2 py-1 text-[10px] font-bold rounded border ${a ? 'bg-sky-600 border-sky-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-gray-400'}`}>{l}</button>
);

export const SettingsMenu = ({ settings: s, onSettingChange: set, onSave, isSaving, onCopy, isCopying, snapshots, uniqueArtists }: any) => {
    const revOpts = snapshots?.map((v: any, i: number) => ({ label: `${formatDate(v.date)} - ${v.revisionLabel || v.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, value: i })).reverse() || [];
    const artOpts = [{ val: 'all', label: 'All Artists' }, ...(uniqueArtists || []).map((a: any) => ({ val: a, label: a }))];

    const toggles = [
        { k: 'showArtist', l: 'Show Artist' },
        { k: 'showVisualMetadata', l: 'Show Metadata', d: s.layoutMode !== 'standard' },
        { k: 'useTierBackground', l: 'Tier Backgrounds', d: s.showRevisionHistory },
        { k: 'useTierColorsForBorder', l: 'Tier Borders', d: s.showRevisionHistory },
        { k: 'useCustomColors', l: 'Custom Colors', d: !s.useTierBackground || s.showRevisionHistory },
        { k: 'showDetails', l: 'Show Details' },
        { k: 'hideTierText', l: 'Hide Tier Text' },
        { k: 'showScore', l: 'Show Tier Scores' },
        { k: 'rankDisplayMode', l: 'Group Rank', v: s.rankDisplayMode === 'group', set: (v: any) => set('rankDisplayMode', v ? 'group' : 'original'), d: s.songTypeFilter === 'all' && s.artistFilter === 'all' && s.sortMode === 'rank' }
    ];

    return (
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-xs font-bold text-gray-400">Modes</h3>
            <div className="divide-y divide-slate-800/50">
                <Tgl l="Show All Songs" s="Include Removed/Legacy" c={s.showAllSongs} o={(v: any) => set('showAllSongs', v)} d={s.showRevisionHistory} />
                <Tgl l="Revision History" c={s.showRevisionHistory} o={(v: any) => set('showRevisionHistory', v)} />
                {s.showRevisionHistory && <div className="pb-2 space-y-3">
                    <Sel l="Revision" v={s.selectedRevisionIndex} o={(v: any) => set('selectedRevisionIndex', +v)} opts={revOpts} />
                    {['revisionSortMode', 'revisionMainRankMode'].map(k => (
                        <div key={k} className="flex flex-col gap-1"><span className="text-[10px] text-gray-400 font-bold">{k.includes('Sort') ? 'Sort By' : 'Main Rank'}</span>
                            <div className="flex gap-1"><Btn l="Rev #" a={s[k] === 'revision'} onClick={() => set(k, 'revision')} /><Btn l="Curr #" a={s[k] === 'current'} onClick={() => set(k, 'current')} /></div>
                        </div>
                    ))}
                    <div className="space-y-1"><span className="text-[10px] text-gray-400 font-bold">Revision Columns</span>
                        {['Current', 'Rel. Hist', 'Rel. Curr'].map((l, i) => { const k = ['showRevisionCurrentRank', 'showRevisionRelativeHistoricalRank', 'showRevisionRelativeCurrentRank'][i]; return <Tgl key={k} l={`Show ${l} #`} c={s[k]} o={(v: any) => set(k, v)} />; })}
                    </div>
                </div>}
            </div>

            <div className="border-t border-slate-700/50 pt-4">
                <h3 className="text-xs font-bold text-gray-400 mb-2">Display</h3>
                <Sel l="Layout Mode" v={s.layoutMode} o={(v: any) => set('layoutMode', v)} opts={[{ val: 'standard', label: 'Standard' }, { val: 'compact', label: 'Compact' }, { val: 'grid', label: 'Grid' }]} />
                <div className="divide-y divide-slate-800/50 mt-2">{toggles.map(t => <Tgl key={t.k} l={t.l} c={t.v ?? s[t.k]} o={t.set ?? ((v: any) => set(t.k, v))} d={t.d} />)}</div>
            </div>

            <div className="border-t border-slate-700/50 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400">Filters</h3>
                <Sel l="Sort Order" v={s.sortMode} o={(v: any) => set('sortMode', v)} opts={[{ val: 'rank', label: 'By Rank' }, { val: 'title', label: 'Alphabetical' }, { val: 'date', label: 'Date Added' }]} />
                <div className="flex flex-col gap-1"><span className="text-sm text-gray-300 font-semibold">History Since</span><input type="date" value={s.historyFilterDate.toISOString().split('T')[0]} onChange={e => set('historyFilterDate', new Date(e.target.value + 'T00:00:00'))} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-xs text-white outline-none" /></div>
                <Sel l="Song Type" v={s.songTypeFilter} o={(v: any) => set('songTypeFilter', v)} opts={[{ val: 'all', label: 'All Types' }, { val: 'Vocal', label: 'Vocal' }, { val: 'Instrumental', label: 'Instrumental' }]} />
                <Sel l="Artist" v={s.artistFilter} o={(v: any) => set('artistFilter', v)} opts={artOpts} />
                <Sel l="Font" v={s.font} o={(v: any) => set('font', v)} opts={['verdana', 'montserrat', 'orbitron'].map(f => ({ val: f, label: f[0].toUpperCase() + f.slice(1) }))} />
            </div>

            <div className="border-t border-slate-700/50 pt-4 space-y-2">
                <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} className="w-full bg-slate-800 hover:bg-slate-700 text-gray-200 py-2 rounded-lg font-semibold text-xs border border-slate-700 transition-colors">Toggle Fullscreen (F)</button>
                <div className="flex gap-2">
                    <button onClick={onSave} disabled={isSaving || isCopying} className="flex-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-200 py-2 rounded-lg font-semibold text-xs border border-sky-600/30 transition-colors disabled:opacity-50">{isSaving ? "..." : "Save (S)"}</button>
                    <button onClick={onCopy} disabled={isSaving || isCopying} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 py-2 rounded-lg font-semibold text-xs border border-emerald-600/30 transition-colors disabled:opacity-50">{isCopying ? "..." : "Copy (⇧C)"}</button>
                </div>
            </div>
        </div>
    );
};
