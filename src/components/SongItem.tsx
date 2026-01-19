import React, { useMemo, useState } from 'react';
import { getTierStyles, getGrayStyles, formatDate, Tier } from '../utils';

// --- 1. INTERNAL COMPONENTS ---
const Thumbnail = ({ imageUrl, alt, priority, className }: { imageUrl: string; alt: string; priority?: boolean, className?: string }) => {
  const [isSquare, setIsSquare] = useState(false);
  return (
    <div className={`${className || 'w-36'} aspect-video shrink-0 bg-black p-[3px] rounded-none`}>
      <img src={imageUrl} alt={alt} loading={priority ? "eager" : "lazy"} className={`w-full h-full ${isSquare ? 'object-contain' : 'object-cover'} bg-black transition-opacity duration-300 rounded-none`}
        onLoad={e => setIsSquare(e.currentTarget.naturalWidth === e.currentTarget.naturalHeight)} />
    </div>
  );
};

// --- 2. INTERNAL HOOK ---
const useSongDisplay = (props: any) => {
  const { song: s, useTierBackground: bg, useTierColorsForBorder: border, useCustomColors: cust, showRevisionHistory: rev, sortMode, revisionMainRankMode } = props;
  const isRank = sortMode === undefined || sortMode === 'rank';
  
  const styles = useMemo(() => {
    const gray = getGrayStyles(), valid = isRank && !s.isLegacy && !s.isUnranked && s.tier;
    const spec = valid ? getTierStyles(s.tier as Tier) : gray;
    return {
      specific: spec,
      activeBorder: ((border ?? bg) && !rev) ? spec : gray,
      containerBg: (cust && s.backgroundColor) ? { backgroundColor: s.backgroundColor } : ((bg && !rev && valid) ? spec.backgroundStyle : gray.backgroundStyle)
    };
  }, [s, bg, border, cust, rev, isRank]);

  return { ...styles, mainRank: isRank ? ((rev && revisionMainRankMode === 'current') ? (s.currentRank ?? 0) : (s.isUnranked ? null : s.rank)) : null, hasExtraCols: rev && (props.showRevisionCurrentRank || props.showRevisionRelativeHistoricalRank || props.showRevisionRelativeCurrentRank) };
};

// --- 3. SUB-COMPONENTS ---
const RevisionColumns = ({ song, isCompact, containerBg, ...p }: any) => (
  <div className={`flex flex-col justify-center shrink-0 pl-2 border-l border-white/5 rounded-none ${isCompact ? 'w-[70px] text-[10px]' : 'w-[100px] text-xl gap-0.5'} font-bold`} style={isCompact ? containerBg : {}}>
    {p.showRevisionCurrentRank && <span className="text-slate-500">#{song.currentRank || '-'}</span>}
    {p.showRevisionRelativeHistoricalRank && <span className="text-sky-400">#{song.relativeHistoricalRank || '-'}</span>}
    {p.showRevisionRelativeCurrentRank && <span className="text-teal-400">#{song.relativeCurrentRank || '-'}</span>}
  </div>
);

const ClassicItem = (p: any) => {
  const { song, isCompact, showDetails, hideTierText, showScore } = p, display = useSongDisplay({ ...p, song });
  return (
    <div className={`flex items-center rounded-none ${isCompact ? 'h-[46px]' : 'gap-2'}`}>
      <div className="flex-1 min-w-0">
        <SimpleItem {...p} styles={{ ...display.activeBorder, backgroundStyle: display.containerBg, textStyle: display.specific.textStyle }} customRankDisplay={p.customRankDisplay || (display.mainRank !== null ? `#${display.mainRank}` : '')}
          rightContent={(<>
              {showDetails && <div className={`text-white opacity-80 rounded-none ${isCompact ? 'text-xs min-w-[80px]' : 'text-sm w-48'} text-right`}><span className="block">{song.type}</span><span className="block opacity-60 italic">{formatDate(song.dateAdded) || (isCompact ? '-' : '—')}</span></div>}
              {(!hideTierText || showScore) && !song.isLegacy && !song.isUnranked && song.tier && <div className={`${isCompact ? 'w-16' : 'w-24'} text-center shrink-0 rounded-none`}>{!hideTierText && <p className={`${isCompact ? 'text-xl' : 'text-4xl'} font-black drop-shadow-md leading-none`} style={display.specific.textStyle}>{song.tier}</p>}{showScore && song.score !== undefined && <p className="text-[10px] font-bold opacity-80 leading-none text-white mt-1">{song.score.toFixed(2)}</p>}</div>}
          </>)} />
      </div>
      {display.hasExtraCols && <RevisionColumns {...p} song={song} containerBg={display.containerBg} />}
    </div>
  );
};

const GridCompactItem = (p: any) => {
  const { song, onClick, hideTierText, showScore, showArtist = true } = p, display = useSongDisplay({ ...p, song });
  return (
    <div onClick={onClick} className="group relative w-full aspect-video p-[3px] cursor-pointer shadow-md transition-transform hover:scale-[1.01] rounded-none" style={display.activeBorder.borderStyle}>
      <div className="relative w-full h-full overflow-hidden bg-black rounded-none">
        <img src={song.imageUrl || song.thumbnail} className="absolute inset-0 w-full h-full object-cover rounded-none" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 rounded-none"><div className="absolute inset-0 p-4 flex flex-col justify-between"><div className="min-w-0 pr-4 flex justify-between items-start"><div className="min-w-0"><h3 className="text-xl font-bold text-white drop-shadow-md leading-tight line-clamp-2">{song.title || song.name}</h3>{showArtist && <p className="text-sm font-semibold text-gray-200 truncate">{song.artist || song.creator}</p>}</div>{song.list && <span className="shrink-0 bg-sky-600/40 border border-sky-400/30 text-[8px] font-black px-1.5 py-0.5 text-white backdrop-blur-sm shadow-xl rounded-none">{song.list}</span>}</div><div className="flex items-end justify-between">{display.hasExtraCols ? <div className="flex items-baseline gap-2 bg-black/50 p-1 rounded-none backdrop-blur-sm">{display.mainRank && <span className="text-2xl font-bold text-white">#{display.mainRank}</span>}</div> : (display.mainRank && <span className="text-3xl font-bold text-white drop-shadow-md">#{display.mainRank}</span>)}{!song.isLegacy && !song.isUnranked && song.tier && <div className="text-right">{!hideTierText && <span className="text-3xl font-black drop-shadow-md" style={display.specific.textStyle}>{song.tier}</span>}{showScore && song.score && <span className="block text-xs font-bold opacity-90">{song.score.toFixed(2)}</span>}</div>}</div></div></div>
      </div>
    </div>
  );
};

const GridWideItem = (p: any) => {
  const { song, onClick, hideTierText, showScore, showArtist = true, showVisualMetadata = true } = p, display = useSongDisplay({ ...p, song });
  const [isSquare, setIsSquare] = useState(false); const isCondensed = !showArtist && !showVisualMetadata;
  return (
    <div onClick={onClick} className={`group relative w-full ${isCondensed ? 'h-24' : 'h-36'} rounded-none cursor-pointer shadow-lg transition-transform hover:scale-[1.01] p-[3px]`} style={display.activeBorder.borderStyle}>
      <div className="w-full h-full relative overflow-hidden flex items-center rounded-none" style={display.containerBg}>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 rounded-none" style={{ backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`, backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none z-0 rounded-none" />
        <div className="relative z-10 flex h-full w-full items-center rounded-none">
          <div className="h-full aspect-video shrink-0 relative overflow-hidden shadow-[4px_0_20px_rgba(0,0,0,0.5)] border-r border-white/10 group-hover:brightness-110 transition-all bg-black rounded-none"><img src={song.imageUrl || song.thumbnail} alt={song.title} className={`w-full h-full ${isSquare ? 'object-contain' : 'object-cover'} rounded-none`} onLoad={e => setIsSquare(e.currentTarget.naturalWidth === e.currentTarget.naturalHeight)} /></div>
          <div className="flex-1 flex justify-between items-center px-6 min-w-0 rounded-none">
            <div className="flex-1 flex flex-col gap-1 min-w-0 pr-4 text-left rounded-none">
                <div className="flex items-center gap-3">
                    {display.mainRank && <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">#{display.mainRank}</span>}
                    {/* --- FIX START: Changed 'leading-tight' to 'leading-normal pb-1', separated 'truncate' into its component classes so padding doesn't get clipped --- */}
                    <h3 className="text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-normal pb-1 whitespace-nowrap overflow-hidden text-ellipsis">{song.title || song.name}</h3>
                    {/* --- FIX END --- */}
                </div>
                {showArtist && <div className="text-lg font-medium text-gray-200 drop-shadow-md">{song.artist || song.creator}</div>}{showVisualMetadata && <div className="flex items-center gap-2 mt-2 rounded-none">{song.type && <span className={`text-xs font-bold px-2 py-0.5 border shadow-sm leading-none rounded-none ${song.type === 'Vocal' ? 'bg-pink-500/20 border-pink-500/30 text-pink-200' : 'bg-blue-500/20 border-blue-500/30 text-blue-200'}`}>{song.type}</span>}{song.dateAdded && <span className="text-xs font-medium px-2 py-0.5 bg-black/40 border border-white/10 text-gray-300 rounded-none">{formatDate(song.dateAdded)}</span>}{song.list && <span className="text-[10px] font-black px-2 py-0.5 bg-sky-600/30 border border-sky-400/40 text-sky-100 shadow-lg rounded-none">{song.list}</span>}</div>}</div>
            {!song.isLegacy && !song.isUnranked && song.tier && <div className={`flex flex-col items-center justify-center shrink-0 pl-6 border-l border-white/10 rounded-none ${isCondensed ? 'h-16' : 'h-20'}`}>{!hideTierText && <span className={`${isCondensed ? 'text-4xl' : 'text-5xl'} font-black block leading-none rounded-none`} style={display.specific.textStyle}>{song.tier}</span>}{showScore && <span className="text-lg font-bold text-white opacity-80 drop-shadow-md mt-[-2px] rounded-none">{song.score?.toFixed(2)}</span>}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const SimpleItem = (p: any) => {
  const { song, onClick, isCompact, isForCapture, showArtist = true, rightContent, styles, customRankDisplay } = p;
  const st = styles || getGrayStyles(), img = song.imageUrl || song.thumbnail, rnk = customRankDisplay ?? (song.rank ? `#${song.rank}` : '');
  
  // MERGED STYLE PROP
  const itemStyle = isCompact 
    ? { ...st.backgroundStyle, borderLeft: `4px solid ${st.borderStyle.backgroundColor}` } 
    : st.borderStyle;

  return (
    <div role="button" onClick={onClick} style={itemStyle} className={`cursor-pointer transition-all hover:brightness-110 relative rounded-none ${isCompact ? 'flex items-center h-[46px]' : 'p-[3px] shadow-lg'}`}>
      <div style={isCompact ? {} : st.backgroundStyle} className={`flex items-center justify-between w-full rounded-none ${isCompact ? 'px-4 h-full' : 'p-2.5'}`}>
        <div className="flex items-center flex-1 min-w-0 rounded-none"><Thumbnail imageUrl={img} alt={song.title} className={isCompact ? "w-20" : "w-36"} priority={isForCapture} /><div className={`flex-1 min-w-0 ${isCompact ? 'ml-4' : 'ml-5'}`}><h3 className={`${isCompact ? 'text-lg' : 'text-xl'} font-black text-white truncate w-full`}>{rnk && <span className="mr-2">{rnk}{isCompact ? ' -' : ''}</span>}{song.title || song.name}</h3>{showArtist && !isCompact && <p className="text-sm text-slate-400 truncate">{song.artist || song.creator}</p>}</div></div>
        {rightContent}
      </div>
    </div>
  );
};

// --- 4. EXPORTS ---
export const SongItem: React.FC<any> = React.memo((props) => {
  const { variant, song, isLoading, isCompact } = props;
  if (isLoading || variant === 'skeleton') return <SkeletonTable itemCount={1} isCompact={isCompact} />;
  if (!song) return null;
  switch (variant) {
    case 'classic': return <ClassicItem {...props} />;
    case 'grid':    return isCompact ? <GridCompactItem {...props} /> : <GridWideItem {...props} />;
    case 'demon':   return <SimpleItem {...props} styles={getGrayStyles()} customRankDisplay={`#${song.rank}`} />;
    case 'simple':  return <SimpleItem {...props} />;
    default: return null;
  }
});

export const SkeletonTable = ({ itemCount = 15, isCompact }: any) => (<div className={`mx-auto w-full space-y-2 max-w-[640px] rounded-none`}>{Array.from({ length: itemCount }).map((_, i) => <div key={i} className={`animate-pulse bg-slate-900/40 rounded-none ${isCompact ? 'h-[46px]' : 'h-32 p-[3px]'}`}><div className="w-full h-full bg-slate-800/40 rounded-none" /></div>)}</div>);

export const SongGrid = ({ songs, onSongClick, isCapturing, ...settings }: any) => {
  const mode = settings.layoutMode || 'standard';
  const cfg: any = { compact: { v: 'classic', ic: true, w: '500px', g: 'flex flex-col' }, grid: { v: 'grid', ic: true, w: '1280px', g: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' }, standard: { v: 'grid', ic: false, w: '900px', g: 'flex flex-col gap-4 max-w-5xl' } }[mode] || { v: 'grid', ic: false, w: '900px', g: 'flex flex-col gap-4 max-w-5xl' };
  const gridCls = `${cfg.g} mx-auto pb-10 rounded-none ${isCapturing ? `w-[${cfg.w}]` : `w-full ${mode === 'grid' ? '' : `max-w-[${cfg.w}]`}`}`;
  return <div className={gridCls}>{songs.map((s: any, i: number) => s.isSeparator ? <div key={i} className="col-span-full flex items-center gap-4 py-8 opacity-40 rounded-none"><div className="h-px bg-white/20 flex-1" /><b className="text-[10px] tracking-widest text-slate-500">{s.title.charAt(0).toUpperCase() + s.title.slice(1)}</b><div className="h-px bg-white/20 flex-1" /></div> : <SongItem key={`${s.rank}-${i}`} variant={cfg.v} song={s} onClick={() => onSongClick(s)} isForCapture={isCapturing} {...settings} isCompact={cfg.ic} />)}</div>;
};