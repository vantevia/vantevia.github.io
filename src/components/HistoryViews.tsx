
import { useState, useEffect, useMemo } from 'react';
import { formatDate, normalizeTitle } from '../utils';
import { SongItem } from './SongItem';

// ==========================================
// 1. SONG DETAIL VIEW (The Drill-down)
// ==========================================
export const SongDetailView = ({ song, historyFilterDate, isCapturing, songImageMap, metadata, onNavigatePrev, onNavigateNext }: any) => {
  const [isSquare, setIsSquare] = useState(false);
  const imageUrl = songImageMap?.get(normalizeTitle(song.title)) || metadata?.imageUrl || 'https://via.placeholder.com/1280x720.png?text=No+Image';
  const history = song.history.filter((e: any) => e.date >= historyFilterDate);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if(e.key==='ArrowLeft'&&onNavigatePrev)onNavigatePrev(); if(e.key==='ArrowRight'&&onNavigateNext)onNavigateNext(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onNavigatePrev, onNavigateNext]);

  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col items-center rounded-none ${isCapturing ? 'p-4 bg-black text-white' : ''}`}>
      <div className="w-full md:w-[80%] aspect-video bg-black/40 mb-8 relative shadow-2xl border border-white/10 overflow-hidden group rounded-none">
        <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110 rounded-none" style={{ backgroundImage: `url(${imageUrl})` }} />
        <img src={imageUrl} className={`relative w-full h-full z-10 transition-transform rounded-none ${isSquare ? 'object-contain' : 'object-cover'}`} onLoad={e => setIsSquare(e.currentTarget.naturalWidth === e.currentTarget.naturalHeight)} />
      </div>

      <div className="flex justify-center items-center gap-4 md:gap-8 mb-4 w-full rounded-none">
        {!isCapturing && onNavigatePrev && <button onClick={onNavigatePrev} className="p-2 hover:text-sky-400 rounded-none"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>}
        <h1 className="text-xl md:text-3xl font-black text-center text-white drop-shadow-lg">{(metadata?.rank ? `#${metadata.rank} - ` : '') + song.title}</h1>
        {!isCapturing && onNavigateNext && <button onClick={onNavigateNext} className="p-2 hover:text-sky-400 rounded-none"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 px-4 border-t border-slate-800/60 pt-6 rounded-none">
        {[ { l: 'Song Link', v: metadata?.link ? <a href={metadata.link} target="_blank" className="hover:text-sky-400 truncate block font-medium">Song Link</a> : null }, { l: 'Added Date', v: metadata?.dateAdded ? formatDate(metadata.dateAdded) : null, c: 'md:items-center md:text-center' }, { l: 'Duration', v: metadata?.duration || '--:--', c: 'md:items-end md:text-right' } ].map((m, i) => (
          <div key={i} className={`flex flex-col rounded-none ${m.c || ''}`}><span className="text-slate-400 text-[10px] font-bold tracking-wider mb-1">{m.l}</span><div className="text-sm md:text-xl text-white border-b border-slate-700/50 pb-2 w-full truncate rounded-none">{m.v || <span className="text-slate-600 italic">Unknown</span>}</div></div>
        ))}
      </div>

      <div className="w-full px-4 rounded-none">
        <h3 className="text-lg font-bold mb-4 border-b border-slate-800 pb-2 text-center tracking-wide rounded-none">Position History</h3>
        <div className="flex flex-col divide-y divide-slate-800/50 rounded-none">
          {history.map((e: any, i: number) => {
            const prev = song.history[song.history.findIndex((h: any) => h === e) - 1]?.rank, diff = prev ? prev - e.rank : null;
            return (
              <div key={i} className="group flex items-center py-4 px-2 hover:bg-white/5 transition-colors gap-4 md:gap-6 rounded-none">
                <div className="w-24 shrink-0 text-slate-300 font-medium">{formatDate(e.date)}</div>
                <div className="flex items-center gap-4 w-40 shrink-0 rounded-none"><b className="w-16 text-right text-lg">#{e.rank}</b><div className="w-20 text-center rounded-none">{diff === null ? <span className="text-sky-400 text-xs font-bold">New</span> : diff > 0 ? <span className="text-green-500 font-bold">▲ {diff}</span> : diff < 0 ? <span className="text-red-500 font-bold">▼ {Math.abs(diff)}</span> : <span className="text-slate-600 font-bold">—</span>}</div></div>
                <div className="flex-1 truncate text-slate-500 group-hover:text-slate-400 rounded-none" title={e.reason}>{e.reason}</div>
              </div>
            );
          })}
          {!history.length && <p className="text-center text-slate-600 py-10 italic rounded-none">No history available in this timeframe.</p>}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. CHANGELOG VIEW (The Global Feed)
// ==========================================
const ICONS = { move: ['↕', 'sky'], swap: ['⇄', 'purple'], place: ['+', 'green'], remove: ['×', 'red'] };

export const ChangelogView = ({ snapshots, songImageMap, remixerMap, artistMap, isCapturing }: any) => {
  const [m, setM] = useState<any>({ isOpen: false });
  const all = useMemo(() => [...snapshots].reverse().flatMap((s, i, a) => s.changelogEntries?.map((e: any) => ({ s, e, prev: a[i+1], d: formatDate(s.date), t: s.date.toLocaleTimeString([], { hour: 'numeric', minute:'2-digit' }) })) || []), [snapshots]);

  const ComparisonModal = ({ isOpen, onClose, beforeSnapshot, afterSnapshot, targetTitle, secTitle, removed, oldRank, newRank }: any) => {
    if (!isOpen) return null;
    const normT = normalizeTitle(targetTitle), normS = secTitle ? normalizeTitle(secTitle) : null;
    const { b, a, isSplit } = useMemo(() => {
      const getSub = (snap: any, center: number) => {
        if (!snap) return [];
        const min = Math.max(1, center - 5), max = Math.min(snap.songs.length, center + 5);
        return snap.songs.slice(min - 1, max).map((s: any) => ({ ...s, isH: normalizeTitle(s.title) === normT || normalizeTitle(s.title) === normS }));
      };
      const b = getSub(beforeSnapshot, removed?.oldRank || oldRank || newRank || 1);
      const a = getSub(afterSnapshot, removed?.oldRank || newRank || 1);
      if (removed) a.push({ ...removed, isH: true, isR: true });
      return { b, a, isSplit: !!(oldRank && newRank && Math.abs(oldRank - newRank) > 5) };
    }, [beforeSnapshot, afterSnapshot, normT, normS, removed, oldRank, newRank]);

    const List = ({ items }: any) => (<div className="flex-1 flex flex-col gap-2 min-w-[300px] rounded-none"><div className="space-y-1 px-1 rounded-none">{items.map((s: any, i: number) => {
        const n = normalizeTitle(s.title), p = { song: { ...s, imageUrl: songImageMap.get(n), remixer: remixerMap.get(n) }, variant: "simple", isCompact: true, showArtist: false };
        return s.isR ? <div key={i} className="mt-4 pt-4 border-t border-slate-700/50 relative outline outline-2 outline-red-500 rounded-none"><SongItem {...p} customRankDisplay='-' /><div className="absolute inset-0 bg-red-900/10 rounded-none" /></div> : <div key={i} className={`transition-all rounded-none ${s.isH ? 'z-10 outline outline-2 outline-sky-400 shadow-xl' : 'opacity-40 grayscale-[0.6]'}`}><SongItem {...p} /></div>;
      })}</div></div>);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 rounded-none" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 shadow-2xl p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-none" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6 rounded-none"><div><h3 className="text-xl font-bold">Position Change</h3></div><button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 bg-slate-800 border border-slate-700 text-xs font-bold rounded-none">Close</button></div>
          <div className="flex flex-col md:flex-row gap-8 pb-2 justify-center rounded-none">{beforeSnapshot && <List items={b} />}{isSplit && <div className="hidden md:block h-64 w-px bg-slate-800 self-center" />}<List items={a} /></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-10 rounded-none">
      <div className="bg-slate-900/40 border border-slate-700/50 shadow-lg divide-y divide-slate-800/50 rounded-none">
        {all.map(({ s, e, d, t, prev }, i) => {
          const [ico, col] = ICONS[e.type as keyof typeof ICONS] || ICONS.move;
          return (
            <div key={i} onClick={() => !isCapturing && setM({ isOpen: true, beforeSnapshot: prev, afterSnapshot: s, targetTitle: e.subjectTitle, secTitle: e.secondaryTitle, newRank: e.newRank, oldRank: e.oldRank, removed: (e.type === 'remove' && e.oldRank) ? { title: e.subjectTitle, artist: artistMap.get(normalizeTitle(e.subjectTitle)), oldRank: e.oldRank } : undefined })} 
              className={`px-6 py-4 flex items-center gap-6 rounded-none ${!isCapturing ? 'hover:bg-slate-800/60 cursor-pointer' : ''}`}>
              <div className="w-32 shrink-0 text-right rounded-none"><p className="text-sm font-bold text-gray-400">{d}</p><p className="text-xs text-slate-600 font-mono mt-0.5">{t}</p></div>
              <div className={`w-8 h-8 flex items-center justify-center shrink-0 border border-white/10 font-bold bg-${col}-500/10 text-${col}-400 border-${col}-500/20 rounded-none`}>{ico}</div>
              <p className="flex-1 text-gray-200 text-sm md:text-base rounded-none">{e.description}</p>
              {!isCapturing && <div className="text-slate-700 rounded-none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg></div>}
            </div>
          );
        })}
      </div>
      {m.isOpen && <ComparisonModal {...m} onClose={() => setM({ isOpen: false })} />}
    </div>
  );
};
