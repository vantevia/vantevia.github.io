
import React, { useMemo, useState } from 'react';
import { getTierStyles, getGrayStyles, formatDate, Tier, TIER_ORDER } from '../utils';

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 rounded-none"><div className="absolute inset-0 p-4 flex flex-col justify-between"><div className="min-w-0 pr-4 flex justify-between items-start"><div className="min-w-0"><h3 className="text-xl font-bold text-white drop-shadow-md leading-tight line-clamp-2">{song.title || song.name}</h3>{showArtist && <p className="text-sm font-semibold text-gray-200 truncate">{song.artist || song.creator}</p>}</div><div className="flex flex-col gap-1 items-end shrink-0">{song.list && <span className="shrink-0 bg-sky-600/40 border border-sky-400/30 text-[8px] font-black px-1.5 py-0.5 text-white backdrop-blur-sm shadow-xl rounded-none">{song.list}</span>}{song.remixer && song.remixer !== 'N/A' && <span className="shrink-0 bg-indigo-600/40 border border-indigo-400/30 text-[8px] font-black px-1.5 py-0.5 text-white backdrop-blur-sm shadow-xl rounded-none">{song.remixer} Remix</span>}</div></div><div className="flex items-end justify-between">{display.hasExtraCols ? <div className="flex items-baseline gap-2 bg-black/50 p-1 rounded-none backdrop-blur-sm">{display.mainRank && <span className="text-2xl font-bold text-white">#{display.mainRank}</span>}</div> : (display.mainRank && <span className="text-3xl font-bold text-white drop-shadow-md">#{display.mainRank}</span>)}{!song.isLegacy && !song.isUnranked && song.tier && <div className="text-right">{!hideTierText && <span className="text-3xl font-black drop-shadow-md" style={display.specific.textStyle}>{song.tier}</span>}{showScore && song.score && <span className="block text-xs font-bold opacity-90">{song.score.toFixed(2)}</span>}</div>}</div></div></div>
      </div>
    </div>
  );
};

const GridWideItem = (p: any) => {
  const { song, onClick, hideTierText, showScore, showArtist = true, showVisualMetadata = true, showDetails, isEditing, onUpdateRank, onUpdateProp } = p;
  const display = useSongDisplay({ ...p, song });
  const [isSquare, setIsSquare] = useState(false);
  const isCondensed = !showArtist && !showVisualMetadata && !showDetails;
  
  const status = song.isLegacy ? 'Legacy' : song.isUnranked ? 'Unranked' : 'Main';
  const remixer = (song.remixer && song.remixer !== 'N/A' && song.remixer !== 'none') ? song.remixer : 'N/A';
  const bgColor = (song.backgroundColor && song.backgroundColor !== 'none') ? song.backgroundColor : 'N/A';

  const handleRankConfirm = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt((e.target as HTMLInputElement).value);
      if (!isNaN(val) && onUpdateRank) {
        onUpdateRank(song.title, val);
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const EditInput = ({ field, value, type = "text" }: { field: string, value: any, type?: string }) => (
    <input 
      key={`${song.title}-${field}`}
      type={type}
      defaultValue={value}
      onBlur={(e) => onUpdateProp(song.title, field, e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as any).blur()}
      className="bg-white/5 border border-white/10 text-white p-1 rounded-none w-full text-xs font-normal outline-none focus:border-sky-500"
    />
  );

  return (
    <div onClick={isEditing ? undefined : onClick} className={`group relative w-full ${showDetails ? 'min-h-[220px]' : (isCondensed ? 'h-24' : 'h-36')} rounded-none ${isEditing ? 'cursor-default' : 'cursor-pointer'} shadow-lg transition-transform hover:scale-[1.01] p-[3px]`} style={display.activeBorder.borderStyle}>
      <div className="w-full h-full relative overflow-hidden flex items-stretch rounded-none" style={display.containerBg}>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 rounded-none" style={{ backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`, backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none z-0 rounded-none" />
        <div className="relative z-10 flex w-full items-stretch rounded-none">
          <div className="h-36 aspect-video shrink-0 relative overflow-hidden shadow-[4px_0_20px_rgba(0,0,0,0.5)] border-r border-white/10 group-hover:brightness-110 transition-all bg-black rounded-none self-center">
            <img src={song.imageUrl || song.thumbnail} alt={song.title} className={`w-full h-full ${isSquare ? 'object-contain' : 'object-cover'} rounded-none`} onLoad={e => setIsSquare(e.currentTarget.naturalWidth === e.currentTarget.naturalHeight)} />
          </div>
          <div className="flex-1 flex justify-between items-center px-6 min-w-0 rounded-none py-4">
            <div className="flex-1 flex flex-col gap-1 min-w-0 pr-4 text-left rounded-none">
              <div className="flex items-center gap-3">
                {display.mainRank !== null && (
                  isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sky-400 font-black text-xl">#</span>
                      <input 
                        key={`${song.title}-rank-input-${display.mainRank}-${song.tier}`}
                        type="text" 
                        inputMode="numeric"
                        defaultValue={display.mainRank} 
                        onKeyDown={handleRankConfirm}
                        className="w-12 bg-white/10 border border-white/20 text-white text-2xl font-black rounded-none text-center outline-none focus:border-sky-500"
                      />
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">#{display.mainRank}</span>
                  )
                )}
                {isEditing ? (
                  <input 
                    key={`${song.title}-title-input`}
                    type="text" 
                    defaultValue={song.title || song.name} 
                    onBlur={(e) => onUpdateProp(song.title, 'title', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as any).blur()}
                    className="flex-1 bg-white/10 border border-white/20 text-white text-2xl font-bold p-1 rounded-none outline-none focus:border-sky-500"
                  />
                ) : (
                  <h3 className="text-2xl font-bold text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">{song.title || song.name}</h3>
                )}
              </div>
              
              {showArtist && (
                <div className="text-lg text-gray-200 drop-shadow-md">
                  {isEditing ? (
                    <input 
                      key={`${song.title}-artist-input`}
                      type="text" 
                      defaultValue={song.artist || song.creator} 
                      onBlur={(e) => onUpdateProp(song.title, 'artist', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as any).blur()}
                      className="w-full bg-white/5 border border-white/10 text-white text-lg p-1 rounded-none outline-none focus:border-sky-500"
                    />
                  ) : (
                    song.artist || song.creator
                  )}
                </div>
              )}
              
              {showDetails ? (
                <div className="flex flex-col text-[12px] text-white gap-1 mt-2 font-normal">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          key={`${song.title}-type-select`}
                          defaultValue={song.type} 
                          onChange={(e) => onUpdateProp(song.title, 'type', e.target.value)}
                          className="bg-white/5 border border-white/10 text-white p-1 text-[11px] rounded-none outline-none"
                        >
                          <option value="Vocal" className="bg-slate-900">Vocal</option>
                          <option value="Instrumental" className="bg-slate-900">Instrumental</option>
                        </select>
                        <EditInput field="dateAdded" value={song.dateAdded} />
                      </div>
                      <EditInput field="remixer" value={remixer} />
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          key={`${song.title}-status-select`}
                          defaultValue={status} 
                          onChange={(e) => {
                            const v = e.target.value;
                            onUpdateProp(song.title, 'isMain', v === 'Main');
                            onUpdateProp(song.title, 'isUnranked', v === 'Unranked');
                          }}
                          className="bg-white/5 border border-white/10 text-white p-1 text-[11px] rounded-none outline-none"
                        >
                          <option value="Main" className="bg-slate-900">Main</option>
                          <option value="Unranked" className="bg-slate-900">Unranked</option>
                          <option value="Legacy" className="bg-slate-900">Legacy</option>
                        </select>
                        <EditInput field="backgroundColor" value={bgColor} />
                      </div>
                      <EditInput field="imageUrl" value={song.imageUrl} />
                      <EditInput field="link" value={song.link} />
                      <EditInput field="duration" value={song.duration} />
                    </>
                  ) : (
                    <>
                      <div>{song.type || 'N/A'}</div>
                      <div>{formatDate(song.dateAdded) || 'N/A'}</div>
                      <div>{remixer}</div>
                      <div>{status}</div>
                      <div>{bgColor}</div>
                      <div className="truncate">{song.imageUrl || 'N/A'}</div>
                      <div className="truncate">{song.link || 'N/A'}</div>
                      <div>{song.duration || 'N/A'}</div>
                    </>
                  )}
                </div>
              ) : (
                showVisualMetadata && !isEditing && (
                  <div className="flex items-center gap-2 mt-2 rounded-none">
                    {song.type && <span className={`text-xs font-bold px-2 py-0.5 border shadow-sm leading-none rounded-none ${song.type === 'Vocal' ? 'bg-pink-500/20 border-pink-500/30 text-pink-200' : 'bg-blue-500/20 border-blue-500/30 text-blue-200'}`}>{song.type}</span>}
                    {song.dateAdded && <span className="text-xs font-medium px-2 py-0.5 bg-black/40 border border-white/10 text-gray-300 rounded-none">{formatDate(song.dateAdded)}</span>}
                    {song.remixer && song.remixer !== 'N/A' && <span className="text-xs font-bold px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 shadow-sm leading-none rounded-none">{song.remixer} Remix</span>}
                    {song.list && <span className="text-[10px] font-black px-2 py-0.5 bg-sky-600/30 border border-sky-400/40 text-sky-100 shadow-lg rounded-none">{song.list}</span>}
                  </div>
                )
              )}
            </div>
            {!song.isLegacy && !song.isUnranked && (
              <div className={`flex flex-col items-center justify-center shrink-0 pl-6 border-l border-white/10 rounded-none h-full`}>
                {isEditing ? (
                  <select 
                    key={`${song.title}-tier-select-${song.tier}`}
                    defaultValue={song.tier} 
                    onChange={(e) => onUpdateProp(song.title, 'tier', e.target.value)}
                    className="bg-white/10 border border-white/20 text-white font-black text-2xl p-2 rounded-none outline-none focus:border-sky-500"
                    style={display.specific.textStyle}
                  >
                    {TIER_ORDER.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                ) : (
                  (!hideTierText || showDetails) && song.tier && <span className={`${isCondensed ? 'text-4xl' : (showDetails ? 'text-6xl' : 'text-5xl')} font-black block leading-none rounded-none`} style={display.specific.textStyle}>{song.tier}</span>
                )}
                {showScore && <span className="text-lg font-bold text-white opacity-80 drop-shadow-md mt-[-2px] rounded-none">{song.score?.toFixed(2)}</span>}
              </div>
            )}
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
  return <div className={gridCls}>{songs.map((s: any, i: number) => s.isSeparator ? <div key={i} className="col-span-full flex items-center gap-4 py-8 opacity-40 rounded-none"><div className="h-px bg-white/20 flex-1" /><b className="text-[10px] tracking-widest text-slate-500">{s.title.charAt(0).toUpperCase() + s.title.slice(1)}</b><div className="h-px bg-white/20 flex-1" /></div> : <SongItem key={s.title} variant={cfg.v} song={s} onClick={() => onSongClick(s)} isForCapture={isCapturing} {...settings} isCompact={cfg.ic} />)}</div>;
};
