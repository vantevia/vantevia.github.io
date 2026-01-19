import React from 'react';

export const Tier = {
  SPlus: 'S+', 
  S: 'S', 
  APlusPlus: 'A++', 
  APlus: 'A+', 
  A: 'A', 
  AMinus: 'A-', 
  BPlus: 'B+', 
  B: 'B', 
  BMinus: 'B-',
} as const;

export type Tier = (typeof Tier)[keyof typeof Tier];
export type ViewMode = 'visual' | 'stats' | 'comparison' | 'demonlist' | 'history-top1' | 'history-changelog' | 'editor';
export type DemonListType = 'main' | 'extended' | 'all';
export type LayoutMode = 'standard' | 'compact' | 'grid';

export interface SongEntry { rank: number; title: string; artist: string; reason?: string; }
export interface ChangelogEntry { type: 'move' | 'place' | 'remove'; description: string; subjectTitle: string; secondaryTitle?: string; oldRank?: number; newRank?: number; }
export interface Snapshot { date: Date; songs: SongEntry[]; revisionLabel?: string; changelogEntries?: ChangelogEntry[]; }
export interface SongHistory { key: string; title: string; artist: string; history: { date: Date; rank: number; reason?: string; revisionLabel?: string }[]; firstSeen: Date; }
export interface DemonLevel { rank: number; name: string; creator: string; thumbnail: string; }

export interface RawSong {
  imageUrl: string; title: string; artist: string; remixer: string | null;
  type: 'Vocal' | 'Instrumental'; dateAdded: string | null; tier: Tier; rank: number;
  isMain: boolean; isUnranked?: boolean; backgroundColor: string | null; link: string | null; duration: string | null;
}

export interface Song extends RawSong {
  revisionRank?: number; currentRank?: number; relativeHistoricalRank?: number; relativeCurrentRank?: number;
  isLegacy?: boolean; isSeparator?: boolean; removedDate?: Date; lastRank?: number; score?: number;
}

export interface DisplaySettings {
  showDetails: boolean; hideTierText: boolean; isCompact: boolean; layoutMode: LayoutMode;
  useTierBackground: boolean; useTierColorsForBorder: boolean; useCustomColors: boolean; showScore: boolean;
  font: 'verdana' | 'montserrat' | 'orbitron'; songTypeFilter: 'all' | 'Vocal' | 'Instrumental';
  artistFilter: string; rankDisplayMode: 'original' | 'group'; sortMode: 'rank' | 'title' | 'date';
  historyFilterDate: Date; showAllSongs: boolean; showRevisionHistory: boolean; selectedRevisionIndex: number;
  revisionSortMode: 'revision' | 'current'; showRevisionCurrentRank: boolean;
  showRevisionRelativeHistoricalRank: boolean; showRevisionRelativeCurrentRank: boolean;
  revisionMainRankMode: 'revision' | 'current'; showArtist: boolean; showVisualMetadata: boolean;
}

export interface TierStyles {
  borderStyle: React.CSSProperties; verticalBorderStyle?: React.CSSProperties;
  backgroundStyle: React.CSSProperties; textStyle: React.CSSProperties;
}

// --- CONFIG & CONSTANTS ---
export const SHEETS_CONFIG = {
  csvUrl: 'https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/export?format=csv',
  songListGid: 113460815, changelogGid: 477178938, demonListGid: 95543877,
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxWyyhOQ3gTBuDLutem8vlywESzM7iXrkaAqJ-T0OA0HXbZfkPNLm6q9vEzYXCXqpfjCg/exec'
};

const TIER_PALETTE = ['#facc15', '#e879f9', '#8078F8', '#3878F8', '#38bdf8', '#22d3ee', '#2dd4bf', '#4ade80', '#a3e635', '#B2DE80', '#F8DE80', '#F8B680'];
export const TIER_ORDER: Tier[] = Object.values(Tier);
const TIER_COLOR_MAP = TIER_ORDER.reduce((a, t, i) => ({ ...a, [t]: TIER_PALETTE[i] || '#a3a3a3' }), {} as Record<Tier, string>);

// --- HELPERS ---
const clean = (t: any) => String(t || '').replace(/""/g, '"').replace(/^"|"$/g, '').trim();
export const normalizeTitle = (t: string) => { const c = clean(t).toLowerCase().replace(/[:_()\[\]"']/g, '').replace(/\s+/g, ' ').trim(); return c === 'strip' ? '牢獄strip' : c; };
export const parseExcelDate = (d: any) => {
  if (!d) return null;
  if (/^\d{5}$/.test(d)) return new Date(Math.floor(d - 25569) * 864e5).toISOString().split('T')[0];
  const ts = Date.parse(d);
  return !isNaN(ts) ? new Date(ts + (d.includes(':') ? 0 : 432e5)).toISOString().split('T')[0] : d;
};
export const formatDate = (d: any) => d instanceof Date ? d.toISOString().split('T')[0] : parseExcelDate(d) || '';

// Optimized CSV Parser
const parseCsv = (text: string) => {
  const rows: string[][] = [], len = text.length;
  let r: string[] = [], f = '', q = false;
  for (let i = 0; i < len; i++) {
    const c = text[i], n = text[i+1];
    if (c === '"') { if (q && n === '"') { f += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { r.push(f); f = ''; }
    else if ((c === '\r' || c === '\n') && !q) { if (c === '\r' && n === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f || r.length) rows.push([...r, f]);
  return rows;
};

const csvToJson = (rows: string[][]) => {
  const h = rows[0]?.map(x => x.toLowerCase().trim()); // Lowercase headers for consistent access
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(r => h.reduce((o, k, i) => ({ ...o, [k]: clean(r[i]) }), {} as any));
};

// --- DATA FETCHING ---
export const fetchSongData = async () => {
  const t1 = await (await fetch(`${SHEETS_CONFIG.csvUrl}&gid=${SHEETS_CONFIG.songListGid}`)).text();
  const raw = csvToJson(parseCsv(t1)), thumbMap = new Map(), artMap = new Map(), remMap = new Map();
  
  const rawSongs = raw.filter((r:any) => r.song).map((r: any, i: number) => {
    const n = normalizeTitle(r.song), img = r.image;
    if (img?.startsWith('http')) thumbMap.set(n, img);
    artMap.set(n, r.artist || 'N/A');
    if (r.remixer && r.remixer !== 'N/A') remMap.set(n, r.remixer);
    return {
      title: r.song, artist: r.artist || 'N/A', remixer: r.remixer, type: r['inst/vocal'] || 'Vocal',
      dateAdded: parseExcelDate(r['date added']), tier: r.tier || 'B-', rank: parseInt(r['#'] || r.rank) || (i + 1),
      imageUrl: img || 'https://via.placeholder.com/128x72.png?text=No+Image',
      backgroundColor: r.background, link: r.link || r.url, duration: r.duration,
      isMain: (r.main || '').toUpperCase() === 'Y', isUnranked: (r.main || '').toUpperCase() === 'U'
    } as RawSong;
  });
  return { rawSongs, thumbnailMap: thumbMap, artistMap: artMap, remixerMap: remMap };
};

export const fetchDemonList = async () => {
  const txt = await (await fetch(`${SHEETS_CONFIG.csvUrl}&gid=${SHEETS_CONFIG.demonListGid}`)).text();
  return { verified: csvToJson(parseCsv(txt)).map((r: any, i) => ({ name: r.name, creator: r.creator, thumbnail: r.image, rank: parseInt(r.rank || r['#'] || (i+1)) })).filter(l => l.name) };
};

export const saveSongData = (songs: RawSong[]) => fetch(SHEETS_CONFIG.scriptUrl, {
  method: 'POST', body: JSON.stringify({ action: 'save_songs', data: songs.map((s, i) => ({ "#": (!s.isMain && !s.isUnranked) ? "" : `=ROW(A${i+2})-1`, "SONG": s.title, "ARTIST": s.artist, "REMIXER": s.remixer||'', "INST/VOCAL": s.type, "Date Added": s.dateAdded||'', "TIER": s.tier, "MAIN": s.isMain?'Y':s.isUnranked?'U':'N', "BACKGROUND": s.backgroundColor||'', "DURATION": s.duration||'', "LINK": s.link||'', "IMAGE": s.imageUrl })) })
}).then(r => r.json());

export const appendChangelog = (log: string[]) => log.length && fetch(SHEETS_CONFIG.scriptUrl, {
  method: 'POST', body: JSON.stringify({ action: 'append_changelog', content: `${new Date().getMonth()+1}/${new Date().getDate()} Changelog\n${log.join('\n')}` })
});

// --- HISTORY PARSING ---
const getNeighbors = (s: SongEntry[], r: number) => ({ text: `above ${s[r]?.title || 'end'} and below ${s[r-2]?.title || 'top'}` });

export const parseHistoryData = (text: string, artMap: Map<string, string>) => {
  const rows = parseCsv(text), snaps: Snapshot[] = [];
  let curSongs: SongEntry[] = [], curDate: Date | null = null;
  
  const flush = () => { if (curDate && curSongs.length) { snaps.push({ date: curDate, songs: curSongs.map(s => ({ ...s, rank: 0 })) }); curSongs = []; curDate = null; } };

  for (const r of rows) {
    const c0 = clean(r[0]);
    if (c0.match(/Song Rankings \((.*)\)/i)) {
      flush(); curDate = new Date(c0.match(/Song Rankings \((.*)\)/i)![1].replace(/, Version \d+/i, '').split(' ')[0]);
    } else if (r.some(c => c.toLowerCase().includes('changelog'))) {
      flush(); if (snaps.length) snaps.push(...applyChangelog(snaps[snaps.length-1], r.find(c => c.toLowerCase().includes('changelog'))!, artMap));
    } else if (curDate && parseInt(c0) && r[1]) {
      curSongs.push({ rank: parseInt(c0), title: clean(r[1]), artist: artMap.get(normalizeTitle(r[1])) || (r[2] !== 'N/A' ? clean(r[2]) : 'N/A') });
    }
  }
  flush(); snaps.sort((a, b) => a.date.getTime() - b.date.getTime());

  const hMap = new Map<string, SongHistory>();
  snaps.forEach(snap => snap.songs.forEach((s, i) => {
    s.rank = i + 1;
    const n = normalizeTitle(s.title), a = artMap.get(n) || s.artist;
    if (!hMap.has(n)) hMap.set(n, { key: `${n}-${a}`, title: s.title, artist: a, history: [], firstSeen: snap.date });
    const e = hMap.get(n)!, last = e.history[e.history.length - 1];
    if (s.rank > 0 && last?.rank !== s.rank) e.history.push({ date: snap.date, rank: s.rank, reason: s.reason || (last ? `Rank updated from #${last.rank} to #${s.rank}` : `Initial ranking at #${s.rank}`), revisionLabel: snap.revisionLabel });
  }));

  return { snapshots: snaps, histories: Array.from(hMap.values()).sort((a, b) => a.title.localeCompare(b.title)) };
};

const applyChangelog = (base: Snapshot, log: string, map: Map<string, string>): Snapshot[] => {
  const lines = log.split('\n').map(l => l.trim()).filter(Boolean);
  let date = new Date(base.date), curSongs = base.songs.map(s => ({ ...s })), rev = 1;
  const dMatch = lines[0].match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
  if (dMatch) { const pd = new Date(Date.parse(dMatch[0] + '/' + base.date.getFullYear())); if (!isNaN(pd.getTime())) date = pd; }

  const snaps: Snapshot[] = [];
  for (const line of lines) {
    if (line.toLowerCase().includes('changelog')) continue;
    let content = line, label;
    const rDate = new Date(date), tMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (tMatch) {
      const [_, h, m, mod] = tMatch[0].match(/(\d+):(\d+)\s*(AM|PM)?/i) || [];
      let hr = parseInt(h); if (mod?.toUpperCase() === 'PM' && hr < 12) hr += 12; else if (mod?.toUpperCase() === 'AM' && hr === 12) hr = 0;
      rDate.setHours(hr, parseInt(m), 0, 0); content = line.replace(tMatch[0], '').replace(/^[:|-]?\s*/, '').trim().replace(/\.$/, '');
    } else { label = `Revision ${rev++}`; rDate.setMilliseconds(rDate.getMilliseconds() + rev); }

    const move = content.match(/(.+) moved from #(\d+) to #(\d+)/i), place = content.match(/(.+) placed at #(\d+)/i), remove = content.match(/(.+) removed/i);
    const entries: ChangelogEntry[] = [];
    let applied = false;

    if (move) {
      const [_, t, oR, nR] = move, idx = curSongs.findIndex(s => normalizeTitle(s.title) === normalizeTitle(t));
      if (idx > -1) {
        curSongs.splice(parseInt(nR) - 1, 0, curSongs.splice(idx, 1)[0]);
        entries.push({ type: 'move', subjectTitle: clean(t), oldRank: parseInt(oR), newRank: parseInt(nR), description: `${clean(t)} moved from #${oR} to #${nR}, ${getNeighbors(curSongs, parseInt(nR)).text}` });
        applied = true;
      }
    } else if (place) {
      const [_, t, nR] = place, exist = curSongs.findIndex(s => normalizeTitle(s.title) === normalizeTitle(t));
      if (exist !== -1) curSongs.splice(exist, 1);
      curSongs.splice(Math.max(0, parseInt(nR) - 1), 0, { rank: 0, title: clean(t), artist: map.get(normalizeTitle(t)) || 'N/A' });
      entries.push({ type: 'place', subjectTitle: clean(t), newRank: parseInt(nR), description: `${clean(t)} placed at #${nR}, ${getNeighbors(curSongs, parseInt(nR)).text}` });
      applied = true;
    } else if (remove) {
      remove[1].split(/ and /i).forEach(t => {
        const idx = curSongs.findIndex(s => normalizeTitle(s.title) === normalizeTitle(t));
        if (idx !== -1) entries.push({ type: 'remove', subjectTitle: curSongs[idx].title, oldRank: idx + 1, description: `${curSongs[idx].title} removed` });
      });
      curSongs = curSongs.filter(s => !remove[1].split(/ and /i).some(rt => normalizeTitle(s.title) === normalizeTitle(rt)));
      applied = true;
    }
    if (applied) {
      curSongs.forEach(s => s.reason = entries.find(e => normalizeTitle(e.subjectTitle) === normalizeTitle(s.title))?.description || s.reason);
      snaps.push({ date: rDate, songs: curSongs.map((s, i) => ({ ...s, rank: i + 1 })), revisionLabel: label, changelogEntries: entries });
    }
  }
  return snaps;
};

export const calculateTierScores = (songs: Song[]) => {
  const scores = new Map<string, number>(), groups: Record<string, Song[]> = {};
  songs.filter(s => s.tier && !s.isSeparator).forEach(s => (groups[s.tier] = groups[s.tier] || []).push(s));
  const RANGES: any = { 'S+': [100, 100], 'S': [99, 100], 'A++': [97, 99], 'A+': [95, 97], 'A': [93, 95], 'A-': [90, 93], 'B+': [87, 90], 'B': [83, 87], 'B-': [80, 83] };
  Object.entries(groups).forEach(([t, list]) => {
    const [min, max] = RANGES[t] || [0, 0], diff = max - min, n = list.length;
    list.sort((a, b) => a.rank - b.rank).forEach((s, i) => scores.set(normalizeTitle(s.title), diff === 0 ? min : n === 1 ? max - 0.01 : min + (diff * ((n - 1 - i) / (n - 1)))));
  });
  return scores;
};

export const downloadCsv = (name: string, head: string[], rows: any[][]) => {
  const csv = [head.join(','), ...rows.map(r => r.map(v => String(v ?? '').match(/,|"/) ? `"${String(v).replace(/"/g, '""')}"` : v).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = name; a.click();
};

// --- STYLES ---
const hslStr = (h: number, s: number, l: number, a: number = 1) => `hsla(${h % 360}, ${Math.min(100, Math.max(0, s * 100))}%, ${Math.min(100, Math.max(0, l * 100))}%, ${a})`;
const hexToHsl = (hex: string) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) { s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = ((max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60); }
  return { h, s, l };
};

const styleCache = new Map<string, TierStyles>();
const genStyle = (hex: string, op = 0.95): TierStyles => {
  if (styleCache.has(hex + op)) return styleCache.get(hex + op)!;
  const { h, s, l } = hexToHsl(hex), mono = s < 0.1 || l > 0.95, bgH = mono ? 215 : h;
  const st = {
    borderStyle: { backgroundImage: `linear-gradient(to bottom right, ${hex}, ${hslStr(h, s * 0.9, l + 0.35)})`, backgroundColor: hex },
    verticalBorderStyle: { backgroundImage: `linear-gradient(to bottom, ${hex}, ${hslStr(h, s * 0.9, l + 0.35)})`, backgroundColor: hex },
    backgroundStyle: { backgroundImage: `linear-gradient(to right, ${hslStr(bgH, mono ? 0.2 : s * 0.6, (mono ? 0.2 : 0.16) - 0.15, op)}, ${hslStr(bgH, mono ? 0.2 : s * 0.6, (mono ? 0.2 : 0.16) + 0.3, op)})`, backgroundColor: hex },
    textStyle: { color: hslStr(h, s * 1.05, l + 0.1) }
  };
  styleCache.set(hex + op, st); return st;
};

export const getTierStyles = (tier: Tier) => genStyle(TIER_COLOR_MAP[tier] || '#a3a3a3');
export const getGrayStyles = () => genStyle('#a3a3a3', 1.0);