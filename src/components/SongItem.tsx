import React, { useMemo, useState, useEffect } from 'react';
import { getTierStyles, getGrayStyles, formatDate, Tier, normalizeTitle, getCompositeKey } from '../utils';

const Thumb = ({ u, a, p, c }: any) => {
  const [q, setQ] = useState(false);
  return <div className={`${c||'w-36'} aspect-video shrink-0 bg-black p-[3px] rounded-none`}><img src={u} alt={a} loading={p?"eager":"lazy"} className={`w-full h-full ${q?'object-contain':'object-cover'} bg-black transition-opacity rounded-none`} onLoad={e=>setQ(e.currentTarget.naturalWidth===e.currentTarget.naturalHeight)}/></div>;
};

const useDisp = ({ song: s, sortMode: sm }: any) => {
  const isR = sm===undefined||sm==='rank', g = getGrayStyles(), v = isR&&!s.isLegacy&&!s.isUnranked&&s.tier;
  const sp = v ? getTierStyles(s.tier as Tier) : g;
  return { sp, bd: v?sp:g, bg: v?sp.backgroundStyle:g.backgroundStyle, r: isR?(s.isUnranked?null:s.rank):null };
};

const Classic = (p: any) => {
  const { song: s, isCompact: ic, showDetails: sd, hideTierText: ht } = p, d = useDisp(p);
  return (
    <div className={`flex items-center rounded-none ${ic?'h-[46px]':'gap-2'}`}><div className="flex-1 min-w-0 relative">
      <Simple {...p} styles={{...d.bd, backgroundStyle:d.bg, textStyle:d.sp.textStyle}} customRank={p.customRankDisplay||(d.r!==null?`#${d.r}`:'')}
        right={(<>
          {sd && <div className={`text-white opacity-80 rounded-none ${ic?'text-xs min-w-[80px]':'text-sm w-48'} text-right`}><span className="block">{s.type}</span><span className="block opacity-60 italic">{formatDate(s.dateAdded)||(ic?'-':'—')}</span></div>}
          {!ht && !s.isLegacy && !s.isUnranked && s.tier && <div className={`${ic?'w-16':'w-24'} text-center shrink-0 rounded-none`}><p className={`${ic?'text-xl':'text-4xl'} font-black drop-shadow-md leading-none`} style={d.sp.textStyle}>{s.tier}</p></div>}
        </>)}/>
    </div></div>
  );
};

const GridC = (p: any) => {
  const { song: s, onClick: c, hideTierText: ht, showArtist: sa=true } = p, d = useDisp(p);
  return (
    <div onClick={c} className="group relative w-full aspect-video p-[3px] cursor-pointer shadow-md hover:scale-[1.01] rounded-none" style={d.bd.borderStyle}>
      <div className="relative w-full h-full overflow-hidden bg-black rounded-none">
        <img src={s.imageUrl||s.thumbnail} className="absolute inset-0 w-full h-full object-cover rounded-none" loading="lazy"/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 rounded-none"><div className="absolute inset-0 p-4 flex flex-col justify-between"><div className="min-w-0 pr-4 flex justify-between items-start"><div className="min-w-0"><h3 className="text-xl font-bold text-white drop-shadow-md leading-tight line-clamp-2">{s.title||s.name}</h3>{sa&&<p className="text-sm font-semibold text-gray-200 truncate">{s.artist||s.creator}</p>}</div><div className="flex flex-col gap-1 items-end shrink-0">{s.list&&<span className="shrink-0 bg-sky-600/40 border border-sky-400/30 text-[8px] font-black px-1.5 py-0.5 text-white backdrop-blur-sm shadow-xl rounded-none">{s.list}</span>}{s.remixer&&s.remixer!=='N/A'&&<span className="shrink-0 bg-indigo-600/40 border border-indigo-400/30 text-[8px] font-black px-1.5 py-0.5 text-white backdrop-blur-sm shadow-xl rounded-none">{s.remixer} Remix</span>}</div></div><div className="flex items-end justify-between">{d.r&&<span className="text-3xl font-bold text-white drop-shadow-md">#{d.r}</span>}{!s.isLegacy&&!s.isUnranked&&s.tier&&<div className="text-right">{!ht&&<span className="text-3xl font-black drop-shadow-md" style={d.sp.textStyle}>{s.tier}</span>}</div>}</div></div></div>
        {s.modernStatus && <div className="absolute bottom-2 right-2 text-xs font-bold text-white pointer-events-none z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{s.modernStatus}</div>}
      </div>
    </div>
  );
};

const GridW = (p: any) => {
  const { song: s, onClick: c, hideTierText: ht, showArtist: sa=true, showVisualMetadata: svm=true, showDetails: sd } = p, d = useDisp(p);
  const [q, setQ] = useState(false), ic = !sa && !svm && !sd;
  return (
    <div onClick={c} className={`group relative w-full ${sd?'min-h-[200px]':(ic?'h-24':'h-36')} rounded-none cursor-pointer shadow-lg hover:scale-[1.01] p-[3px]`} style={d.bd.borderStyle}>
      <div className="w-full h-full relative overflow-hidden flex items-stretch rounded-none" style={d.bg}>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 rounded-none" style={{backgroundImage:`linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000),linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%,#000)`,backgroundSize:'20px 20px',backgroundPosition:'0 0, 10px 10px'}}/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none z-0 rounded-none"/>
        <div className="relative z-10 flex w-full items-stretch rounded-none">
          <div className="h-36 aspect-video shrink-0 relative overflow-hidden shadow-[4px_0_20px_rgba(0,0,0,0.5)] border-r border-white/10 group-hover:brightness-110 bg-black rounded-none self-center"><img src={s.imageUrl||s.thumbnail} alt={s.title} className={`w-full h-full ${q?'object-contain':'object-cover'} rounded-none`} onLoad={e=>setQ(e.currentTarget.naturalWidth===e.currentTarget.naturalHeight)}/></div>
          <div className="flex-1 flex justify-between items-center px-6 min-w-0 rounded-none py-4">
            <div className="flex-1 flex flex-col gap-1 min-w-0 pr-4 text-left rounded-none">
              <div className="flex items-center gap-3">{d.r!==null&&<span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">#{d.r}</span>}<h3 className="text-2xl font-bold text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">{s.title||s.name}</h3></div>
              {sa && <div className="text-lg text-gray-200 drop-shadow-md">{s.artist||s.creator}</div>}
              {sd ? <div className="flex flex-col text-[12px] text-white gap-1 mt-2 font-normal"><div>{s.type||'N/A'}</div><div>{formatDate(s.dateAdded)||'N/A'}</div><div>{(s.remixer&&s.remixer!=='N/A'&&s.remixer!=='none')?s.remixer:'N/A'}</div><div>{s.isLegacy?'Legacy':s.isUnranked?'Unranked':'Main'}</div><div className="truncate">{s.imageUrl||'N/A'}</div><div className="truncate">{s.link||'N/A'}</div><div>{s.duration||'N/A'}</div></div> : (svm && <div className="flex items-center gap-2 mt-2 rounded-none">
                {s.type&&<span className={`text-xs font-bold px-2 py-0.5 border shadow-sm leading-none rounded-none ${s.type==='Vocal'?'bg-pink-500/20 border-pink-500/30 text-pink-200':'bg-blue-500/20 border-blue-500/30 text-blue-200'}`}>{s.type}</span>}
                {s.dateAdded&&<span className="text-xs font-medium px-2 py-0.5 bg-black/40 border border-white/10 text-gray-300 rounded-none">{formatDate(s.dateAdded)}</span>}
                {s.remixer&&s.remixer!=='N/A'&&<span className="text-xs font-bold px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 shadow-sm leading-none rounded-none">{s.remixer} Remix</span>}
                {s.list&&<span className="text-[10px] font-black px-2 py-0.5 bg-sky-600/30 border border-sky-400/40 text-sky-100 shadow-lg rounded-none">{s.list}</span>}
              </div>)}
            </div>
            {!s.isLegacy&&!s.isUnranked&&(!ht||sd)&&s.tier&&<div className={`flex flex-col items-center justify-center shrink-0 pl-6 border-l border-white/10 rounded-none h-full`}><span className={`${ic?'text-4xl':(sd?'text-6xl':'text-5xl')} font-black block leading-none rounded-none`} style={d.sp.textStyle}>{s.tier}</span></div>}
          </div>
        </div>
        {s.modernStatus && <div className="absolute bottom-3 right-5 text-sm font-bold text-white pointer-events-none z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{s.modernStatus}</div>}
      </div>
    </div>
  );
};

const Simple = ({ song: s, onClick: c, isCompact: ic, isForCapture: ifc, showArtist: sa=true, right: r, styles: st=getGrayStyles(), customRank: cr }: any) => {
  const img = s.imageUrl||s.thumbnail, rnk = cr??(s.rank?`#${s.rank}`:''), sty = ic?{...st.backgroundStyle,borderLeft:`4px solid ${st.borderStyle.backgroundColor}`}:st.borderStyle;
  return (
    <div role="button" onClick={c} style={sty} className={`cursor-pointer hover:brightness-110 relative rounded-none ${ic?'flex items-center h-[46px]':'p-[3px] shadow-lg'}`}>
      <div style={ic?{}:st.backgroundStyle} className={`flex items-center justify-between w-full rounded-none ${ic?'px-4 h-full':'p-2.5'}`}>
        <div className="flex items-center flex-1 min-w-0 rounded-none"><Thumb u={img} a={s.title} c={ic?"w-20":"w-36"} p={ifc} /><div className={`flex-1 min-w-0 ${ic?'ml-4':'ml-5'}`}><h3 className={`${ic?'text-lg':'text-xl'} font-black text-white truncate w-full`}>{rnk&&<span className="mr-2">{rnk}{ic?' -':''}</span>}{s.title||s.name}</h3>{sa&&!ic&&<p className="text-sm text-slate-400 truncate">{s.artist||s.creator}</p>}</div></div>
        {r}
      </div>
    </div>
  );
};

const PositionHistory = ({ song, changelog, titleToArtistMap, displayTitleMap }: any) => {
  const history = useMemo(() => {
    if (!changelog || !song) return [];
    let list: string[] = [], hist: any[] = [], i = 0;
    const tKey = getCompositeKey(song.title, song.artist), tTitle = song.title;
    const titles = new Map(displayTitleMap);
    const gk = (e: any) => getCompositeKey(e.song, e.artist || titleToArtistMap.get(normalizeTitle(e.song)) || 'N/A');

    while (i < changelog.length) {
      const e = changelog[i], k = gk(e), isT = k === tKey;
      if (!titles.has(k)) titles.set(k, e.song);

      if (e.type === 'Snapshot') {
        const ts = e.timestamp, oldList = [...list]; list = [];
        while (i < changelog.length && changelog[i].type === 'Snapshot' && changelog[i].timestamp === ts) {
          const se = changelog[i], sk = gk(se), tIdx = Math.max(0, Math.min(list.length, se.new - 1));
          if (!titles.has(sk)) titles.set(sk, se.song);
          const ex = list.indexOf(sk); if(ex!==-1) list.splice(ex,1); list.splice(tIdx,0,sk); i++;
        }
        const oIdx = oldList.indexOf(tKey), nIdx = list.indexOf(tKey);
        if (oIdx === -1 && nIdx !== -1) hist.push({ date: e.date, change: '-', pos: nIdx+1, reason: `Added to list`, type: 'add' });
        else if (oIdx !== -1 && nIdx === -1) hist.push({ date: e.date, change: '-', pos: '-', reason: `Removed from list`, type: 'loss' });
        else if (oIdx !== -1 && nIdx !== -1 && oIdx !== nIdx) hist.push({ date: e.date, change: (oIdx+1) - (nIdx+1), pos: nIdx+1, reason: `${tTitle} reordered from #${oIdx+1} to #${nIdx+1}`, type: oIdx > nIdx ? 'gain' : 'loss' });
        continue;
      }
      const bef = list.indexOf(tKey), tIdx = Math.max(0, Math.min(list.length, e.new - 1));
      if (e.type === 'Placement') {
        const ex = list.indexOf(k); if(ex!==-1) list.splice(ex,1); list.splice(tIdx,0,k); const aft = list.indexOf(tKey);
        if (isT) hist.push({ date: e.date, change: '-', pos: e.new, reason: `Added to list`, type: 'add' });
        else if (bef!==-1 && bef!==aft) hist.push({ date: e.date, change: bef-aft, pos: aft+1, reason: `${e.song} placed at #${e.new}`, type: 'loss' });
      } else if (e.type === 'Movement') {
        const ex = list.indexOf(k);
        if (ex !== -1) {
          list.splice(ex,1); list.splice(tIdx,0,k); const aft = list.indexOf(tKey);
          if (isT) hist.push({ date: e.date, change: e.old-e.new, pos: e.new, reason: `${tTitle} moved from #${e.old} to #${e.new}`, type: e.old>e.new?'gain':'loss' });
          else if (bef!==-1 && bef!==aft) hist.push({ date: e.date, change: bef-aft, pos: aft+1, reason: `${e.song} moved from #${e.old} to #${e.new}`, type: bef>aft?'gain':'loss' });
        }
      } else if (e.type === 'Removal') {
        const ex = list.indexOf(k);
        if (ex !== -1) {
          list.splice(ex,1); const aft = list.indexOf(tKey);
          if (isT) hist.push({ date: e.date, change: '-', pos: '-', reason: `Moved to Legacy List`, type: 'loss' });
          else if (bef!==-1 && bef!==aft) hist.push({ date: e.date, change: bef-aft, pos: aft+1, reason: `${e.song} moved to Legacy List`, type: 'gain' });
        }
      } else if (e.type === 'Swap') {
          const ex = list.indexOf(k);
          if (ex > 0) {
            const oK = list[ex-1], oT = titles.get(oK) || oK.split('::')[0];
            list[ex-1] = k; list[ex] = oK; const aft = list.indexOf(tKey);
            if (isT) hist.push({ date: e.date, change: bef-aft, pos: aft+1, reason: `${tTitle} swapped with ${oT}`, type: bef>aft?'gain':'loss' });
            else if (oK === tKey) hist.push({ date: e.date, change: bef-aft, pos: aft+1, reason: `${tTitle} swapped with ${e.song}`, type: bef>aft?'gain':'loss' });
          }
      } else if (e.type === 'Clear') list = [];
      i++;
    }
    return hist;
  }, [changelog, song, titleToArtistMap, displayTitleMap]);
  if (!history.length) return null;
  return (
    <div className="w-full mt-8">
        <h3 className="text-xl font-bold text-center mb-4 text-white">Position History</h3>
        <div className="w-full bg-slate-900 border border-slate-700">
            <div className="grid grid-cols-[100px_80px_100px_1fr] bg-slate-950 font-bold text-white text-sm border-b border-slate-700">
                <div className="p-3 text-center">Date</div><div className="p-3 text-center">Change</div><div className="p-3 text-center leading-tight">New Position</div><div className="p-3 text-center">Reason</div>
            </div>
            {history.map((h, i) => {
                const bg = h.type === 'gain' ? 'bg-emerald-900/20 text-emerald-200' : h.type === 'loss' ? 'bg-rose-900/20 text-rose-200' : 'bg-yellow-900/10 text-yellow-100';
                return (
                    <div key={i} className={`grid grid-cols-[100px_80px_100px_1fr] text-sm font-bold border-b border-slate-800/50 ${bg}`}>
                        <div className="p-3 text-center flex items-center justify-center">{h.date}</div>
                        <div className="p-3 text-center flex items-center justify-center gap-1">{h.change === '-' ? '-' : <>{h.change > 0 ? '↑' : '↓'} {Math.abs(h.change)}</>}</div>
                        <div className="p-3 text-center flex items-center justify-center text-lg font-black">{h.pos}</div>
                        <div className="p-3 flex items-center justify-center text-center">{h.reason}</div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export const SkeletonTable = ({ itemCount: n=15, isCompact: ic }: any) => (<div className="mx-auto w-full space-y-2 max-w-[640px] rounded-none">{Array.from({length:n}).map((_,i)=><div key={i} className={`animate-pulse bg-slate-900/40 rounded-none ${ic?'h-[46px]':'h-32 p-[3px]'}`}><div className="w-full h-full bg-slate-800/40 rounded-none"/></div>)}</div>);

export const SongItem: React.FC<any> = React.memo((p) => {
  const { variant: v, song: s, isLoading: l, isCompact: ic } = p;
  if (l || v === 'skeleton') return <SkeletonTable itemCount={1} isCompact={ic} />;
  if (!s) return null;
  const C = { classic: Classic, grid: ic ? GridC : GridW, demon: (x: any) => <Simple {...x} styles={getGrayStyles()} customRank={`#${x.song.rank}`} />, simple: Simple }[v as string];
  return C ? <C {...p} /> : null;
});

export const SongGrid = ({ songs: s, onSongClick: c, isCapturing: ic, layoutMode: m='standard', ...p }: any) => {
  const cfg: any = { compact: {v:'classic',i:true,w:'500px',g:'flex flex-col'}, grid: {v:'grid',i:true,w:'1280px',g:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}, standard: {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'} }[m] || {v:'grid',i:false,w:'900px',g:'flex flex-col gap-4 max-w-5xl'};
  return <div className={`${cfg.g} mx-auto pb-10 rounded-none ${ic?`w-[${cfg.w}]`:`w-full ${m==='grid'?'':`max-w-[${cfg.w}]`}`}`}>{s.map((x: any, i: number) => x.isSeparator ? <div key={i} className="col-span-full flex items-center gap-4 py-8 opacity-40 rounded-none"><div className="h-px bg-white/20 flex-1"/><b className="text-[10px] tracking-widest text-slate-500">{x.title.charAt(0).toUpperCase()+x.title.slice(1)}</b><div className="h-px bg-white/20 flex-1"/></div> : <SongItem key={x.title} variant={cfg.v} song={x} onClick={()=>c(x)} isForCapture={ic} {...p} isCompact={cfg.i} />)}</div>;
};

export const SongDetailView = ({ song: s, isCapturing: ic, onNavigatePrev: p, onNavigateNext: n, changelog, titleToArtistMap, displayTitleMap, songId }: any) => {
  const [sq, setSq] = useState(false), img = s.imageUrl||'https://via.placeholder.com/1280x720.png?text=No+Image';
  useEffect(() => { const h=(e:KeyboardEvent)=>{if(e.key==='ArrowLeft'&&p)p();if(e.key==='ArrowRight'&&n)n();}; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); }, [p,n]);
  const tierSt = s.tier ? getTierStyles(s.tier as Tier) : getGrayStyles();
  const items = [
    {l:'ID',v:`#${songId||'?'}`}, {l:'Tier',v:s.tier||'N/A',s:tierSt.textStyle}, {l:'Song Link',v:s.link?<a href={s.link} target="_blank" className="hover:text-sky-400 truncate block font-medium">Song Link</a>:null},
    {l:'Added Date',v:s.dateAdded?formatDate(s.dateAdded):null}, {l:'Duration',v:s.duration||'--:--'}, {l:'Remixer',v:(s.remixer&&s.remixer!=='N/A'&&s.remixer!=='none')?s.remixer:'N/A'}
  ];
  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col items-center rounded-none ${ic?'p-4 bg-black text-white':''}`}>
      <div className="w-full md:w-[80%] aspect-video bg-black/40 mb-8 relative shadow-2xl border border-white/10 overflow-hidden group rounded-none"><div className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110 rounded-none" style={{backgroundImage:`url(${img})`}}/><img src={img} className={`relative w-full h-full z-10 transition-transform rounded-none ${sq?'object-contain':'object-cover'}`} onLoad={e=>setSq(e.currentTarget.naturalWidth===e.currentTarget.naturalHeight)}/></div>
      <div className="flex flex-col items-center gap-2 mb-4 w-full rounded-none">
          <div className="flex justify-center items-center gap-4 md:gap-8">{!ic&&p&&<button onClick={p} className="p-2 hover:text-sky-400 rounded-none"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>}<h1 className="text-xl md:text-3xl font-black text-center text-white drop-shadow-lg">{(!s.isUnranked && s.rank ? `#${s.rank} - ` : '') + s.title}</h1>{!ic&&n&&<button onClick={n} className="p-2 hover:text-sky-400 rounded-none"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>}</div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-400">{s.artist}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 px-4 border-t border-slate-800/60 pt-6 rounded-none">
        {items.map((m,i)=>(<div key={i} className={`flex flex-col rounded-none md:items-center md:text-center`}><span className="text-slate-400 text-[10px] font-bold tracking-wider mb-1">{m.l}</span><div className="text-sm md:text-xl text-white border-b border-slate-700/50 pb-2 w-full truncate rounded-none" style={m.s}>{m.v||<span className="text-slate-600 italic">Unknown</span>}</div></div>))}
      </div>
      {changelog && <PositionHistory song={s} changelog={changelog} titleToArtistMap={titleToArtistMap} displayTitleMap={displayTitleMap} />}
      <div className="w-full px-4 text-center rounded-none mb-20 mt-8"><p className="text-slate-500 text-sm font-medium">Detailed information and artist info displayed above.</p></div>
    </div>
  );
};