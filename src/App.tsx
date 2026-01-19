import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RawSong, DemonLevel, DisplaySettings, ViewMode, DemonListType, fetchSongData, fetchDemonList, parseHistoryData, downloadCsv, normalizeTitle, SongHistory } from './utils';
import { useScreenshot, ScreenshotModal } from './components/ScreenshotModal';
import { useProcessedData } from './components/useProcessedData';
import { SongDetailView, TopOneHistoryView, ChangelogView } from './components/HistoryViews';
import { SongItem, SkeletonTable, SongGrid } from './components/SongItem';
import { StatsView } from './components/StatsView';
import { Sidebar } from './components/Sidebar';
import { ComparisonView } from './components/ComparisonView';
import { EditorView } from './components/EditorView';

// --- SHARED HEADER ---
const SharedHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="w-full mb-6 grid grid-cols-[1fr_auto_1fr] px-4 md:px-8 z-10">
    <div className="col-start-2 text-center">
      {/* Removed 'uppercase' from the class list below */}
      <h1 className="text-3xl sm:text-4xl font-bold text-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide">{title}</h1>
      <p className="text-gray-300 text-sm sm:text-base text-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{subtitle}</p>
    </div>
  </header>
);

// --- CONFIGURATION ---
const VIEW_TITLES: Record<string, string> = {
  visual: 'Revamp',
  stats: 'Statistics',
  comparison: 'Comparison',
  'history-top1': 'Top 1 History',
  'history-changelog': 'Changelog',
  editor: 'Data Editor',
  demonlist: 'Verified Levels List'
};

const DEMON_LIST_TITLES: Record<string, string> = {
  main: 'Main List',
  extended: 'Extended List',
  all: 'Verified Levels List'
};

// --- MAIN APP ---
export default function App() {
  const [data, setData] = useState({ rawSongs: [] as RawSong[], thumbnailMap: new Map(), artistMap: new Map(), remixerMap: new Map(), demonLevels: { verified: [] } as Record<string, DemonLevel[]>, snapshots: [] as any[], histories: [] as SongHistory[], loading: true, error: null as string | null });
  
  const [settings, setSettings] = useState<DisplaySettings>({
    showDetails: false, hideTierText: true, isCompact: false, layoutMode: 'standard', useTierBackground: true, useTierColorsForBorder: true, useCustomColors: true, showScore: false,
    font: 'montserrat', songTypeFilter: 'all', artistFilter: 'all', rankDisplayMode: 'original', sortMode: 'rank', historyFilterDate: new Date(2023, 4, 5),
    showAllSongs: false, showRevisionHistory: false, selectedRevisionIndex: 0, revisionSortMode: 'revision', showRevisionCurrentRank: true, showRevisionRelativeHistoricalRank: true, showRevisionRelativeCurrentRank: true, revisionMainRankMode: 'revision', showArtist: true, showVisualMetadata: true
  });

  const [viewState, setViewState] = useState({ active: 'visual' as ViewMode, selectedHistorySong: null as SongHistory | null });
  const [demonListType, setDemonListType] = useState<DemonListType>('main');
  const [captureModal, setCaptureModal] = useState({ isOpen: false, action: 'save' as 'save' | 'copy' });
  const [captureLimit, setCaptureLimit] = useState<number | null>(null);

  const { isCapturing, isSaving, isCopying, capture } = useScreenshot();
  const contentRef = useRef<HTMLDivElement>(null);
  const { displayedSongs, displayedDemonLevels, uniqueArtists, remixerMap, historyMap, currentMaxEntries, selectedSongMetadata, globalNavigationList } = useProcessedData({ data, settings, viewState, demonListType });

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
      
      // Hotkeys
      if (e.code === 'KeyS') setCaptureModal({ isOpen: true, action: 'save' });
      if (e.shiftKey && e.code === 'KeyC') setCaptureModal({ isOpen: true, action: 'copy' });
      if (e.code === 'KeyF') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      
      // Restored Layout Toggles
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

  const getPageTitle = () => {
    if (viewState.selectedHistorySong) return 'Song Details';
    if (viewState.active === 'demonlist') return DEMON_LIST_TITLES[demonListType];
    return VIEW_TITLES[viewState.active] || viewState.active;
  };

  const VIEWS: any = {
    visual: <SongGrid songs={captureLimit ? displayedSongs.slice(0, captureLimit) : displayedSongs} onSongClick={(s: any) => selSong(historyMap.get(normalizeTitle(s.title)) || null)} isCapturing={isCapturing} {...settings} />,
    stats: <StatsView songs={displayedSongs} isCapturing={isCapturing} />,
    comparison: <ComparisonView allSongs={globalNavigationList} isCapturing={isCapturing} />,
    'history-top1': <TopOneHistoryView snapshots={data.snapshots} songsHistory={data.histories} maxItems={captureLimit} onSongSelect={selSong} songImageMap={data.thumbnailMap} songRemixerMap={remixerMap} isCapturing={isCapturing} />,
    'history-changelog': <ChangelogView snapshots={data.snapshots} songImageMap={data.thumbnailMap} remixerMap={remixerMap} artistMap={data.artistMap} isCapturing={isCapturing} />,
    editor: <EditorView songs={data.rawSongs} onSaveSuccess={() => window.location.reload()} />,
    demonlist: (
      <>
        {!isCapturing && <div className="flex justify-center gap-2 mb-6">{['main', 'extended', 'all'].map(t => <button key={t} onClick={() => setDemonListType(t as any)} className={`px-4 py-2 rounded font-bold text-sm border ${demonListType === t ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{t === 'all' ? 'Full List' : `${t.charAt(0).toUpperCase() + t.slice(1)} List`}</button>)}</div>}
        <div className={`mx-auto ${settings.isCompact ? 'w-[500px]' : 'w-[900px]'} ${settings.isCompact ? 'flex flex-col shadow-2xl' : 'space-y-4'}`}>{(captureLimit ? displayedDemonLevels.slice(0, captureLimit) : displayedDemonLevels).map(l => <SongItem key={`${l.rank}-${l.name}`} variant="grid" song={l} isCompact={settings.isCompact} isForCapture={isCapturing} showArtist={settings.showArtist} />)}</div>
      </>
    )
  };

  return (
    <div className="min-h-screen text-white p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <SharedHeader title="The Depths III" subtitle="Vantevia's Lists" />
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-start gap-8 relative">
        {!isCapturing && <Sidebar viewState={viewState} settings={settings} demonListType={demonListType} dataSnapshots={data.snapshots} uniqueArtists={uniqueArtists} isSaving={isSaving} isCopying={isCopying} onNavTo={(m: any) => { setViewState({ active: m, selectedHistorySong: null }); window.scrollTo({ top: 0, behavior: 'instant' }); }} onSetDemonListType={setDemonListType} onSetSettings={setSettings} onRequestCapture={(a: any) => setCaptureModal({ isOpen: true, action: a })} onExportCsv={() => downloadCsv('ranking.csv', ['Rank', 'Title', 'Artist', 'Tier'], displayedSongs.map(s => [s.rank, s.title, s.artist, s.tier]))} onClearHistorySelection={() => selSong(null)} />}
        <main className="flex-1 w-full min-w-0">
          {!isCapturing && <h2 className="text-2xl font-bold mb-6 border-b border-slate-700/50 pb-4">{getPageTitle()}</h2>}
          {data.loading ? <SkeletonTable itemCount={15} isCompact={settings.isCompact} /> : data.error ? <div className="p-4 bg-red-900/50 text-red-200">{data.error}</div> : <div ref={contentRef} className={`bg-transparent ${isCapturing ? 'p-4 mx-auto w-fit' : 'w-full'}`}>{viewState.selectedHistorySong ? <SongDetailView song={viewState.selectedHistorySong} historyFilterDate={settings.historyFilterDate} isCapturing={isCapturing} snapshots={data.snapshots} songImageMap={data.thumbnailMap} remixerMap={remixerMap} metadata={selectedSongMetadata} onNavigatePrev={hIndex > 0 ? () => navStep(-1) : undefined} onNavigateNext={hIndex < globalNavigationList.length - 1 ? () => navStep(1) : undefined} /> : VIEWS[viewState.active]}</div>}
        </main>
      </div>
      <ScreenshotModal isOpen={captureModal.isOpen} onClose={() => setCaptureModal(p => ({ ...p, isOpen: false }))} onConfirm={executeCapture} action={captureModal.action} maxEntries={currentMaxEntries} />
    </div>
  );
}