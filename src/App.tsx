import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchSongData, fetchDemonList, fetchChangelog, getCompositeKey, Song } from './utils';
import { useScreenshot, ScreenshotModal } from './components/ScreenshotModal';
import { useProcessedData } from './components/useProcessedData';
import { SongItem, SkeletonTable, SongGrid, SongDetailView } from './components/SongItem';
import { StatsView } from './components/StatsView';
import { Sidebar } from './components/Sidebar';
import { ChangelogView } from './components/ChangelogView';

const DL_FLT = ["Pointercrate", "Verified", "Verification Progress", "Completed", ">50% Complete", "<50% Complete", "0% Complete"];

export default function App() {
  const [d, setD] = useState<any>({ rawSongs: [], thumbnailMap: new Map(), artistMap: new Map(), remixerMap: new Map(), typeMap: new Map(), linkMap: new Map(), dateMap: new Map(), durationMap: new Map(), titleToArtistMap: new Map(), demonLevels: { verified: [] }, changelog: [], loading: true, error: null });
  const [s, setS] = useState<any>({ showDetails: false, hideTierText: true, isCompact: false, layoutMode: 'standard', font: 'montserrat', songTypeFilter: 'all', tierFilter: 'all', artistFilter: 'all', rankDisplayMode: 'original', sortMode: 'rank', historyFilterDate: new Date(2023, 4, 5), showAllSongs: false, showArtist: true, showVisualMetadata: true, historyPoint: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  const [vs, setVs] = useState({ active: 'visual', selectedSong: null as Song|null });
  const [dlt, setDlt] = useState('main');
  const [dlf, setDlf] = useState("Verified");
  const [cm, setCm] = useState({ isOpen: false, action: 'save' });
  const [cl, setCl] = useState<number|null>(null);

  const { isCapturing: ic, isSaving: isSv, isCopying: isCp, capture: cap } = useScreenshot();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchSongData(), fetchDemonList(), fetchChangelog()])
      .then(([r, l, c]) => setD({ ...r, demonLevels: l, changelog: c, loading: false, error: null }))
      .catch(() => setD(p => ({ ...p, loading: false, error: 'Failed to load data.' })));
  }, []);

  const pd = useProcessedData({ data: d, settings: s, viewState: vs, demonListType: dlt, demonListFilter: dlf });
  const msm = useMemo(()=>new Map(d.rawSongs.map((r:any)=>[r.title+'::'+r.artist, r.isMain?`#${r.rank}`:'Legacy'])),[d.rawSongs]);
  const dtm = useMemo(()=>new Map(d.rawSongs.map((r:any)=>[getCompositeKey(r.title, r.artist), r.title])),[d.rawSongs]);
  
  const idMap = useMemo(() => {
    if (!d.rawSongs.length) return new Map();
    const sorted = d.rawSongs.map((s:any, i:number) => ({ ...s, origIdx: i })).sort((a:any, b:any) => {
        const dA = new Date(a.dateAdded || 0).getTime(), dB = new Date(b.dateAdded || 0).getTime();
        return dA === dB ? a.origIdx - b.origIdx : dA - dB;
    });
    return new Map(sorted.map((s:any, i:number) => [getCompositeKey(s.title, s.artist), i + 1]));
  }, [d.rawSongs]);

  const updS = (k: string, v: any) => setS((p:any) => ({ ...p, [k]: v }));
  const nav = (m: string) => { setVs({ active: m, selectedSong: null }); window.scrollTo(0, 0); };
  const sel = (x: Song|null) => { setVs((p:any) => ({ ...p, selectedSong: x })); window.scrollTo(0, 0); };

  useEffect(() => { document.body.className = `font-${s.font}`; }, [s.font]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'KeyS') setCm({ isOpen: true, action: 'save' });
      if (e.shiftKey && e.code === 'KeyC') setCm({ isOpen: true, action: 'copy' });
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      if (e.code === 'KeyC' && !e.shiftKey) setS((p:any) => ({ ...p, layoutMode: p.layoutMode === 'compact' ? 'standard' : 'compact' }));
      if (e.code === 'KeyG') setS((p:any) => ({ ...p, layoutMode: p.layoutMode === 'grid' ? 'standard' : 'grid' }));
    };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, []);

  const exec = async (sc: number, lim?: number) => {
    if (lim) setCl(lim); setCm(p => ({ ...p, isOpen: false }));
    await cap(ref.current, cm.action as any, vs.selectedSong ? `${vs.selectedSong.title.replace(/[^a-z0-9]/gi, '_')}_detail.png` : `${vs.active}.png`, sc);
    setCl(null);
  };

  const activeList = vs.active === 'changelog' ? pd.historyList : pd.globalNavigationList;
  const idx = useMemo(() => {
    if (!vs.selectedSong) return -1;
    const currentKey = getCompositeKey(vs.selectedSong.title, vs.selectedSong.artist);
    return activeList.findIndex((x: any) => !x.isSeparator && getCompositeKey(x.title, x.artist) === currentKey);
  }, [activeList, vs.selectedSong]);

  const step = (dir: 1|-1) => { let i = idx; while(true) { i+=dir; if(i<0||i>=activeList.length) break; const x = activeList[i]; if(x&&!x.isSeparator) { sel(x); break; } } };
  
  const lCfg = ({ compact: {v:'classic',i:true,w:'500px',g:'flex flex-col'}, grid: {v:'grid',i:true,w:'1280px',g:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}, standard: {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'} }[s.layoutMode as string] || {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'});
  const V: any = {
    visual: <SongGrid songs={cl ? pd.displayedSongs.slice(0, cl) : pd.displayedSongs} onSongClick={sel} isCapturing={ic} {...s} />,
    stats: <StatsView songs={pd.displayedSongs} isCapturing={ic} onSetSettings={updS} onNavTo={nav} />,
    changelog: <ChangelogView list={pd.historyList} changelog={d.changelog} historyPoint={s.historyPoint} isCapturing={ic} onSongClick={sel} onSetHistoryPoint={(v: any) => updS('historyPoint', v)} thumbnailMap={d.thumbnailMap} artistMap={d.artistMap} remixerMap={d.remixerMap} typeMap={d.typeMap} linkMap={d.linkMap} dateMap={d.dateMap} durationMap={d.durationMap} titleToArtistMap={d.titleToArtistMap} modernStatusMap={msm} layoutMode={s.layoutMode} showArtist={s.showArtist} hideTierText={s.hideTierText} showVisualMetadata={s.showVisualMetadata} />,
    demonlist: (<>{!ic && <div className="flex flex-col items-center gap-4 mb-8"><div className="flex flex-wrap justify-center gap-2">{['main','extended','all'].map(t=><button key={t} onClick={()=>setDlt(t)} className={`px-4 py-2 rounded-none font-bold text-sm border transition-colors ${dlt===t?'bg-sky-600 text-white border-sky-500':'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{t==='all'?'Full':t[0].toUpperCase()+t.slice(1)} List</button>)}</div><div className="flex flex-wrap justify-center gap-2 items-center">{DL_FLT.map(f=><button key={f} onClick={()=>setDlf(f)} className={`px-3 py-1.5 rounded-none text-[10px] font-black tracking-tight border transition-all ${dlf===f?'bg-sky-500 text-white border-sky-400':'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'}`}>{f}</button>)}</div></div>}<div className={`${lCfg.g} mx-auto pb-10 rounded-none ${ic?`w-[${lCfg.w}]`:`w-full ${s.layoutMode==='grid'?'':`max-w-[${lCfg.w}]`}`}`}>{(cl?pd.displayedDemonLevels.slice(0,cl):pd.displayedDemonLevels).map((l:any)=><SongItem key={`${l.rank}-${l.name}`} variant={lCfg.v} song={l} isCompact={lCfg.i} isForCapture={ic} showArtist={s.showArtist} />)}</div></>)
  };

  return (
    <div className="min-h-screen text-white p-0 flex flex-col items-stretch">
      {!ic && <header className="w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 shadow-2xl"><div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{backgroundImage:`linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000),linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)`,backgroundSize:'24px 24px',backgroundPosition:'0 0, 12px 12px'}}/><div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex-1 w-full"><Sidebar viewState={vs} settings={s} demonListType={dlt} uniqueArtists={pd.uniqueArtists} isSaving={isSv} isCopying={isCp} onNavTo={nav} onSetDemonListType={setDlt} onSetSettings={updS} onRequestCapture={(a:any)=>setCm({isOpen:true,action:a})} onClearHistorySelection={()=>sel(null)}/></div><div className="text-right"><h1 className="text-3xl sm:text-4xl font-black font-orbitron leading-none" style={{color:'black',WebkitTextStroke:'1.2px #00ffff',paintOrder:'stroke fill'}}>Vantevia's Lists</h1></div></div></header>}
      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 flex flex-col items-center overflow-x-hidden">{d.loading ? <SkeletonTable itemCount={15} isCompact={s.isCompact} /> : d.error ? <div className="p-4 bg-red-900/50 text-red-200">{d.error}</div> : (<div ref={ref} className={`bg-transparent ${ic?'p-4 mx-auto w-fit':'w-full flex justify-center'}`}><div className="w-full">{vs.selectedSong ? <SongDetailView song={vs.selectedSong} changelog={d.changelog} titleToArtistMap={d.titleToArtistMap} displayTitleMap={dtm} songId={idMap.get(getCompositeKey(vs.selectedSong.title, vs.selectedSong.artist))} isCapturing={ic} onNavigatePrev={idx>0?()=>step(-1):undefined} onNavigateNext={idx<activeList.length-1?()=>step(1):undefined}/> : V[vs.active]}</div></div>)}</main>
      <ScreenshotModal isOpen={cm.isOpen} onClose={()=>setCm(p=>({...p,isOpen:false}))} onConfirm={exec} action={cm.action} maxEntries={pd.currentMaxEntries}/>
    </div>
  );
}