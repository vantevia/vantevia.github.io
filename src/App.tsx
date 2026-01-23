
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RawSong, DemonLevel, DisplaySettings, ViewMode, DemonListType, fetchSongData, fetchDemonList, parseHistoryData, downloadCsv, normalizeTitle, SongHistory, saveSongData, appendChangelog, TIER_ORDER, Tier } from './utils';
import { useScreenshot, ScreenshotModal } from './components/ScreenshotModal';
import { useProcessedData } from './components/useProcessedData';
import { SongDetailView, TopOneHistoryView, ChangelogView } from './components/HistoryViews';
import { SongItem, SkeletonTable, SongGrid } from './components/SongItem';
import { StatsView } from './components/StatsView';
import { Sidebar as TopBar } from './components/Sidebar';
import { ComparisonView } from './components/ComparisonView';

const BrandedTitle = () => (
  <div className="text-right">
    <h1 className="text-3xl sm:text-4xl font-black font-orbitron lowercase leading-none" 
        style={{ 
          color: 'black', 
          WebkitTextStroke: '1.2px #00ffff',
          paintOrder: 'stroke fill'
        }}>
      vantevia's lists
    </h1>
  </div>
);

const DEMON_LIST_FILTERS = ["Pointercrate", "Verified", "Verification Progress", "Completed", ">50% Complete", "<50% Complete", "0% Complete"];

export default function App() {
  const [data, setData] = useState({ rawSongs: [] as RawSong[], thumbnailMap: new Map(), artistMap: new Map(), remixerMap: new Map(), demonLevels: { verified: [] } as Record<string, DemonLevel[]>, snapshots: [] as any[], histories: [] as SongHistory[], loading: true, error: null as string | null });
  
  const [settings, setSettings] = useState<DisplaySettings>({
    showDetails: false, hideTierText: true, isCompact: false, layoutMode: 'standard', useTierBackground: true, useTierColorsForBorder: true, useCustomColors: true, showScore: false,
    font: 'montserrat', songTypeFilter: 'all', artistFilter: 'all', rankDisplayMode: 'original', sortMode: 'rank', historyFilterDate: new Date(2023, 4, 5),
    showAllSongs: false, showRevisionHistory: false, selectedRevisionIndex: 0, revisionSortMode: 'revision', showRevisionCurrentRank: true, showRevisionRelativeHistoricalRank: true, showRevisionRelativeCurrentRank: true, revisionMainRankMode: 'revision', showArtist: true, showVisualMetadata: true
  });

  const [viewState, setViewState] = useState({ active: 'visual' as ViewMode, selectedHistorySong: null as SongHistory | null });
  const [demonListType, setDemonListType] = useState<DemonListType>('main');
  const [demonListFilter, setDemonListFilter] = useState<string>("Verified");
  const [captureModal, setCaptureModal] = useState({ isOpen: false, action: 'save' as 'save' | 'copy' });
  const [captureLimit, setCaptureLimit] = useState<number | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [localRawSongs, setLocalRawSongs] = useState<RawSong[]>([]);
  const [editLog, setEditLog] = useState<string[]>([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isAutoLog, setIsAutoLog] = useState(false);
  const [pendingLogEntry, setPendingLogEntry] = useState<string | null>(null);

  const { isCapturing, isSaving, isCopying, capture } = useScreenshot();
  const contentRef = useRef<HTMLDivElement>(null);

  const processedDataInput = useMemo(() => ({
    ...data,
    rawSongs: isEditing ? localRawSongs : data.rawSongs
  }), [data, isEditing, localRawSongs]);

  const effectiveSettings = useMemo(() => ({
    ...settings,
    showAllSongs: isEditing ? true : settings.showAllSongs
  }), [settings, isEditing]);

  const { displayedSongs, displayedDemonLevels, uniqueArtists, remixerMap, historyMap, currentMaxEntries, selectedSongMetadata, globalNavigationList } = useProcessedData({ 
    data: processedDataInput, 
    settings: effectiveSettings, 
    viewState, 
    demonListType, 
    demonListFilter 
  });

  useEffect(() => {
    Promise.all([fetchSongData(), fetch('https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/export?format=csv&gid=477178938').then(r => r.text()), fetchDemonList()])
      .then(([songs, hist, demons]) => {
        const hData = parseHistoryData(hist, songs.artistMap);
        setData({ ...songs, demonLevels: demons, snapshots: hData.snapshots, histories: hData.histories, loading: false, error: null });
        setLocalRawSongs(songs.rawSongs.map(s => ({ ...s })));
        setSettings(s => ({ ...s, selectedRevisionIndex: hData.snapshots.length - 1 }));
      })
      .catch(() => setData(prev => ({ ...prev, loading: false, error: 'Failed to load data.' })));
  }, []);

  useEffect(() => { document.body.className = `font-${settings.font}`; }, [settings.font]);

  const toggleEditMode = useCallback(() => {
    setIsEditing(prev => {
      const next = !prev;
      if (!next) {
        setLocalRawSongs(data.rawSongs.map(s => ({ ...s })));
        setEditLog([]);
        setPendingLogEntry(null);
      }
      return next;
    });
  }, [data.rawSongs]);

  const handleRankMove = useCallback((title: string, newRank: number) => {
    setLocalRawSongs(prev => {
      const mainSongs = prev.filter(s => s.isMain).sort((a, b) => a.rank - b.rank);
      const otherSongs = prev.filter(s => !s.isMain);
      
      const curIdx = mainSongs.findIndex(s => s.title === title);
      if (curIdx === -1 || newRank < 1 || newRank > mainSongs.length || curIdx + 1 === newRank) return prev;
      
      const nextMain = mainSongs.map(s => ({ ...s }));
      const [movedSong] = nextMain.splice(curIdx, 1);
      const targetIdx = newRank - 1;
      nextMain.splice(targetIdx, 0, movedSong);
      
      const prevNeighbor = nextMain[targetIdx - 1];
      const nextNeighbor = nextMain[targetIdx + 1];
      let targetTier: Tier | undefined;

      if (prevNeighbor && nextNeighbor) {
        if (prevNeighbor.tier === nextNeighbor.tier) {
          targetTier = prevNeighbor.tier as Tier;
        } else {
          const idx1 = TIER_ORDER.indexOf(prevNeighbor.tier as Tier);
          const idx2 = TIER_ORDER.indexOf(nextNeighbor.tier as Tier);
          targetTier = TIER_ORDER[Math.min(idx1, idx2)];
        }
      } else if (prevNeighbor) {
        targetTier = prevNeighbor.tier as Tier;
      } else if (nextNeighbor) {
        targetTier = nextNeighbor.tier as Tier;
      }

      if (targetTier) movedSong.tier = targetTier;

      const finalMain = nextMain.map((s, idx) => {
        const song = { ...s, rank: idx + 1 };
        if (idx === 0) {
          song.tier = 'S+';
        } else if (song.tier === 'S+') {
          song.tier = 'S';
        }
        return song;
      });

      const final = [...finalMain, ...otherSongs];
      
      const logMsg = `${movedSong.title} moved from #${curIdx + 1} to #${newRank}`;
      if (isAutoLog) {
        setEditLog(log => [`${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}: ${logMsg}`, ...log]);
      } else {
        setPendingLogEntry(logMsg);
      }
      
      return final;
    });
  }, [isAutoLog]);

  const handleUpdateProp = useCallback((title: string, field: keyof RawSong, value: any) => {
    setLocalRawSongs(prev => {
      const idx = prev.findIndex(s => s.title === title);
      if (idx === -1) return prev;
      
      const songToUpdate = prev[idx];
      const oldIsMain = songToUpdate.isMain;
      const oldRank = songToUpdate.rank;
      
      const next = prev.map(s => ({ ...s }));
      (next[idx] as any)[field] = value;

      const newIsMain = next[idx].isMain;
      const newIsUnranked = next[idx].isUnranked;

      // Check if moved to Legacy from Main
      if (oldIsMain && !newIsMain && !newIsUnranked) {
        const logMsg = `${songToUpdate.title} removed`;
        if (isAutoLog) {
          setEditLog(log => [`${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}: ${logMsg}`, ...log]);
        } else {
          setPendingLogEntry(logMsg);
        }
        
        // Re-rank remaining main songs to fill the gap
        next.forEach(s => {
          if (s.isMain && s.rank > oldRank) {
            s.rank -= 1;
          }
        });
        next[idx].rank = 0; 
      }

      // Final pass: enforce S+ rules and sequential ranking consistency
      const mainSorted = next.filter(s => s.isMain).sort((a, b) => a.rank - b.rank);
      mainSorted.forEach((s, i) => {
        const targetIdx = next.findIndex(orig => orig.title === s.title);
        if (targetIdx !== -1) {
          next[targetIdx].rank = i + 1;
          if (i === 0) next[targetIdx].tier = 'S+';
          else if (next[targetIdx].tier === 'S+') next[targetIdx].tier = 'S';
        }
      });

      return next;
    });
  }, [isAutoLog]);

  const handleManualLog = () => {
    if (pendingLogEntry) {
      setEditLog(log => [`${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}: ${pendingLogEntry}`, ...log]);
      setPendingLogEntry(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingChanges(true);
    try {
      await saveSongData(localRawSongs);
      if (editLog.length) await appendChangelog([...editLog].reverse().map(x => x));
      alert('Changes saved successfully!');
      window.location.reload();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setIsSavingChanges(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'KeyE') toggleEditMode();
      if (e.code === 'KeyS') setCaptureModal({ isOpen: true, action: 'save' });
      if (e.shiftKey && e.code === 'KeyC') setCaptureModal({ isOpen: true, action: 'copy' });
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      if (e.code === 'KeyC' && !e.shiftKey) setSettings(p => ({ ...p, layoutMode: p.layoutMode === 'compact' ? 'standard' : 'compact' }));
      if (e.code === 'KeyG') setSettings(p => ({ ...p, layoutMode: p.layoutMode === 'grid' ? 'standard' : 'grid' }));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleEditMode]);

  const executeCapture = useCallback(async (scale: number, limit?: number) => {
    if (limit) setCaptureLimit(limit); setCaptureModal(p => ({ ...p, isOpen: false }));
    const name = viewState.selectedHistorySong ? `${viewState.selectedHistorySong.title.replace(/[^a-z0-9]/gi, '_')}_history.png` : `${viewState.active}.png`;
    await capture(contentRef.current, captureModal.action, name, scale);
    setCaptureLimit(null);
  }, [captureModal.action, capture, viewState, viewState.selectedHistorySong]);

  const selSong = (s: SongHistory | null) => { setViewState(p => ({ ...p, selectedHistorySong: s })); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const hIndex = useMemo(() => viewState.selectedHistorySong ? globalNavigationList.findIndex(s => !s.isSeparator && normalizeTitle(s.title) === normalizeTitle(viewState.selectedHistorySong!.title)) : -1, [globalNavigationList, viewState.selectedHistorySong]);
  const navStep = (dir: 1 | -1) => {
    let idx = hIndex;
    while (true) { idx += dir; if (idx < 0 || idx >= globalNavigationList.length) break; const h = historyMap.get(normalizeTitle(globalNavigationList[idx].title)); if (h && !globalNavigationList[idx].isSeparator) { selSong(h); break; } }
  };

  const getLayoutConfig = (mode: string) => {
    return { 
      compact: { v: 'classic' as any, ic: true, w: '500px', g: 'flex flex-col' }, 
      grid: { v: 'grid' as any, ic: true, w: '1280px', g: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' }, 
      standard: { v: 'grid' as any, ic: false, w: '900px', g: 'flex flex-col gap-4 max-w-5xl' } 
    }[mode] || { v: 'grid' as any, ic: false, w: '900px', g: 'flex flex-col gap-4 max-w-5xl' };
  };

  const VIEWS: any = {
    visual: <SongGrid 
      songs={captureLimit ? displayedSongs.slice(0, captureLimit) : displayedSongs} 
      onSongClick={(s: any) => isEditing ? null : selSong(historyMap.get(normalizeTitle(s.title)) || null)} 
      isCapturing={isCapturing} 
      {...effectiveSettings} 
      isEditing={isEditing}
      onUpdateRank={handleRankMove}
      onUpdateProp={handleUpdateProp}
    />,
    stats: <StatsView songs={displayedSongs} isCapturing={isCapturing} />,
    comparison: <ComparisonView allSongs={globalNavigationList} isCapturing={isCapturing} />,
    'history-top1': <TopOneHistoryView snapshots={data.snapshots} songsHistory={data.histories} maxItems={captureLimit} onSongSelect={selSong} songImageMap={data.thumbnailMap} songRemixerMap={remixerMap} isCapturing={isCapturing} settings={effectiveSettings} />,
    'history-changelog': <ChangelogView snapshots={data.snapshots} songImageMap={data.thumbnailMap} remixerMap={remixerMap} artistMap={data.artistMap} isCapturing={isCapturing} />,
    demonlist: (
      <>
        {!isCapturing && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex flex-wrap justify-center gap-2">
              {['main', 'extended', 'all'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setDemonListType(t as any)} 
                  className={`px-4 py-2 rounded-none font-bold text-sm border transition-colors ${demonListType === t ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                >
                  {t === 'all' ? 'Full List' : `${t.charAt(0).toUpperCase() + t.slice(1)} List`}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 items-center">
              {DEMON_LIST_FILTERS.map(f => (
                <button 
                  key={f} 
                  onClick={() => setDemonListFilter(f)} 
                  className={`px-3 py-1.5 rounded-none text-[10px] font-black tracking-tight border transition-all ${demonListFilter === f ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
        {(() => {
          const cfg = getLayoutConfig(settings.layoutMode);
          const listCls = `${cfg.g} mx-auto pb-10 rounded-none ${isCapturing ? `w-[${cfg.w}]` : `w-full ${settings.layoutMode === 'grid' ? '' : `max-w-[${cfg.w}]`}`}`;
          return (
            <div className={listCls}>
              {(captureLimit ? displayedDemonLevels.slice(0, captureLimit) : displayedDemonLevels).map(l => (
                <SongItem key={`${l.rank}-${l.name}`} variant={cfg.v} song={l} isCompact={cfg.ic} isForCapture={isCapturing} showArtist={settings.showArtist} />
              ))}
            </div>
          );
        })()}
      </>
    )
  };

  const handleUpdateSetting = useCallback((key: string, val: any) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="min-h-screen text-white p-0 flex flex-col items-stretch">
      {!isCapturing && (
        <header className="w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
               style={{ 
                 backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`, 
                 backgroundSize: '24px 24px', 
                 backgroundPosition: '0 0, 12px 12px' 
               }} 
          />
          <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <TopBar 
                viewState={viewState} 
                settings={effectiveSettings} 
                demonListType={demonListType} 
                dataSnapshots={data.snapshots} 
                uniqueArtists={uniqueArtists} 
                isSaving={isSaving} 
                isCopying={isCopying} 
                onNavTo={(m: any) => { setViewState({ active: m, selectedHistorySong: null }); window.scrollTo({ top: 0, behavior: 'instant' }); }} 
                onSetDemonListType={setDemonListType} 
                onSetSettings={handleUpdateSetting} 
                onRequestCapture={(a: any) => setCaptureModal({ isOpen: true, action: a })} 
                onExportCsv={() => downloadCsv('ranking.csv', ['Rank', 'Title', 'Artist', 'Tier'], displayedSongs.map(s => [s.rank, s.title, s.artist, s.tier]))} 
                onClearHistorySelection={() => selSong(null)} 
              />
            </div>
            <BrandedTitle />
          </div>
        </header>
      )}

      {isEditing && !isCapturing && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl p-4 flex items-center gap-4 pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-sky-400">Edit Mode Active</span>
              <span className="text-xs text-slate-400">{editLog.length} Changes Logged</span>
            </div>
            <div className="h-8 w-px bg-slate-800 mx-2" />
            
            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-400">
              <input type="checkbox" checked={isAutoLog} onChange={e => setIsAutoLog(e.target.checked)} className="accent-sky-500 rounded-none" />
              Auto-Log
            </label>

            {!isAutoLog && pendingLogEntry && (
              <button onClick={handleManualLog} className="px-3 py-1 bg-sky-600 text-white text-[10px] font-black hover:bg-sky-500 transition-colors">Log Change</button>
            )}

            <button 
              onClick={toggleEditMode} 
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
            >
              Exit
            </button>
            <button 
              onClick={handleSaveAll}
              disabled={isSavingChanges}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
            >
              {isSavingChanges ? 'Saving...' : 'Save to Sheets'}
            </button>
          </div>
          {editLog.length > 0 && (
            <div className="w-80 max-h-48 overflow-y-auto bg-slate-900/90 border border-slate-800 p-3 shadow-2xl pointer-events-auto backdrop-blur-sm">
              <div className="space-y-1">
                {editLog.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono text-slate-400 border-b border-slate-800/50 pb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <main className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 flex flex-col items-center overflow-x-hidden">
        {data.loading ? <SkeletonTable itemCount={15} isCompact={settings.isCompact} /> : data.error ? <div className="p-4 bg-red-900/50 text-red-200">{data.error}</div> : (
          <div ref={contentRef} className={`bg-transparent ${isCapturing ? 'p-4 mx-auto w-fit' : 'w-full flex justify-center'}`}>
            <div className="w-full">
              {viewState.selectedHistorySong ? <SongDetailView song={viewState.selectedHistorySong} historyFilterDate={settings.historyFilterDate} isCapturing={isCapturing} snapshots={data.snapshots} songImageMap={data.thumbnailMap} remixerMap={remixerMap} metadata={selectedSongMetadata} onNavigatePrev={hIndex > 0 ? () => navStep(-1) : undefined} onNavigateNext={hIndex < globalNavigationList.length - 1 ? () => navStep(1) : undefined} /> : VIEWS[viewState.active]}
            </div>
          </div>
        )}
      </main>

      <ScreenshotModal isOpen={captureModal.isOpen} onClose={() => setCaptureModal(p => ({ ...p, isOpen: false }))} onConfirm={executeCapture} action={captureModal.action} maxEntries={currentMaxEntries} />
    </div>
  );
}
