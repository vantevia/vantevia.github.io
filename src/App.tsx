
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RawSong, DemonLevel, DisplaySettings, ViewMode, DemonListType, fetchSongData, fetchDemonList, parseHistoryData, downloadCsv, normalizeTitle, SongHistory } from './utils';
import { useScreenshot, ScreenshotModal } from './components/ScreenshotModal';
import { useProcessedData } from './components/useProcessedData';
import { SongDetailView, TopOneHistoryView, ChangelogView } from './components/HistoryViews';
import { SongItem, SkeletonTable, SongGrid } from './components/SongItem';
import { StatsView } from './components/StatsView';
import { Sidebar as TopBar } from './components/Sidebar';
import { ComparisonView } from './components/ComparisonView';
import { EditorView } from './components/EditorView';

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

  const { isCapturing, isSaving, isCopying, capture } = useScreenshot();
  const contentRef = useRef<HTMLDivElement>(null);
  const { displayedSongs, displayedDemonLevels, uniqueArtists, remixerMap, historyMap, currentMaxEntries, selectedSongMetadata, globalNavigationList } = useProcessedData({ data, settings, viewState, demonListType, demonListFilter });

  useEffect(() => {
    Promise.all([fetchSongData(), fetch('https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/export?format=csv&gid=477178938').then(r => r.text()), fetchDemonList()])
      .then(([songs, hist, demons]) => {
        const hData = parseHistoryData(hist, songs.artistMap);
        setData({ ...songs, demonLevels: demons, snapshots: hData.snapshots, histories: hData.histories, loading: false, error: null });
        setSettings(s => ({ ...s, selectedRevisionIndex: hData.snapshots.length - 1 }));
      })
      .catch(() => setData(prev => ({ ...prev, loading: false, error: 'Failed to load data.' })));
  }, []);

  useEffect(() => { document.body.className = `font-${settings.font}`; }, [settings.font]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'KeyS') setCaptureModal({ isOpen: true, action: 'save' });
      if (e.shiftKey && e.code === 'KeyC') setCaptureModal({ isOpen: true, action: 'copy' });
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      if (e.code === 'KeyC' && !e.shiftKey) setSettings(p => ({ ...p, layoutMode: p.layoutMode === 'compact' ? 'standard' : 'compact' }));
      if (e.code === 'KeyG') setSettings(p => ({ ...p, layoutMode: p.layoutMode === 'grid' ? 'standard' : 'grid' }));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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

  const VIEWS: any = {
    visual: <SongGrid songs={captureLimit ? displayedSongs.slice(0, captureLimit) : displayedSongs} onSongClick={(s: any) => selSong(historyMap.get(normalizeTitle(s.title)) || null)} isCapturing={isCapturing} {...settings} />,
    stats: <StatsView songs={displayedSongs} isCapturing={isCapturing} />,
    comparison: <ComparisonView allSongs={globalNavigationList} isCapturing={isCapturing} />,
    'history-top1': <TopOneHistoryView snapshots={data.snapshots} songsHistory={data.histories} maxItems={captureLimit} onSongSelect={selSong} songImageMap={data.thumbnailMap} songRemixerMap={remixerMap} isCapturing={isCapturing} settings={settings} />,
    'history-changelog': <ChangelogView snapshots={data.snapshots} songImageMap={data.thumbnailMap} remixerMap={remixerMap} artistMap={data.artistMap} isCapturing={isCapturing} />,
    editor: <EditorView songs={data.rawSongs} onSaveSuccess={() => window.location.reload()} />,
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
        <div className={`mx-auto ${settings.isCompact ? 'w-[500px]' : 'w-[900px]'} ${settings.isCompact ? 'flex flex-col shadow-2xl' : 'space-y-4'}`}>
          {(captureLimit ? displayedDemonLevels.slice(0, captureLimit) : displayedDemonLevels).map(l => (
            <SongItem key={`${l.rank}-${l.name}`} variant="grid" song={l} isCompact={settings.isCompact} isForCapture={isCapturing} showArtist={settings.showArtist} />
          ))}
        </div>
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
          {/* Subtle Checkerboard Pattern */}
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
                settings={settings} 
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
