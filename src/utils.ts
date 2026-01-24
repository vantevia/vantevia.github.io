import React from 'react';

// --- TYPES & CONSTANTS ---
export const Tier = { SPlus: 'S+', S: 'S', APlusPlus: 'A++', APlus: 'A+', A: 'A', AMinus: 'A-', BPlus: 'B+', B: 'B', BMinus: 'B-' } as const;
export type Tier = (typeof Tier)[keyof typeof Tier];
export type ViewMode = 'visual' | 'stats' | 'demonlist' | 'history-changelog' | 'editor';
export type LayoutMode = 'standard' | 'compact' | 'grid';
// Added missing type definition below:
export type DemonListType = 'main' | 'extended' | 'all';

export interface SongEntry { rank: number; title: string; artist: string; reason?: string; }
export interface ChangelogEntry { type: 'move' | 'place' | 'remove'; description: string; subjectTitle: string; secondaryTitle?: string; oldRank?: number; newRank?: number; }
export interface Snapshot { date: Date; songs: SongEntry[]; revisionLabel?: string; changelogEntries?: ChangelogEntry[]; }
export interface SongHistory { key: string; title: string; artist: string; history: { date: Date; rank: number; reason?: string; revisionLabel?: string }[]; firstSeen: Date; }
export interface DemonLevel { rank: number; name: string; creator: string; thumbnail: string; list: string; }

export interface RawSong {
  imageUrl: string; title: string; artist: string; remixer: string | null; type: 'Vocal' | 'Instrumental';
  dateAdded: string | null; tier: Tier; rank: number; isMain: boolean; isUnranked?: boolean; backgroundColor: string | null; link: string | null; duration: string | null;
}
export interface Song extends RawSong { revisionRank?: number; currentRank?: number; relativeHistoricalRank?: number; relativeCurrentRank?: number; isLegacy?: boolean; isSeparator?: boolean; removedDate?: Date; lastRank?: number; }

export interface DisplaySettings {
  showDetails: boolean; hideTierText: boolean; isCompact: boolean; layoutMode: LayoutMode; font: 'verdana' | 'montserrat' | 'orbitron';
  songTypeFilter: 'all' | 'Vocal' | 'Instrumental'; tierFilter: string; artistFilter: string; rankDisplayMode: 'original' | 'group';
  sortMode: 'rank' | 'title' | 'date'; historyFilterDate: Date; showAllSongs: boolean; showRevisionHistory: boolean;
  selectedRevisionIndex: number; revisionSortMode: 'revision' | 'current'; showRevisionCurrentRank: boolean;
  showRevisionRelativeHistoricalRank: boolean; showRevisionRelativeCurrentRank: boolean; revisionMainRankMode: 'revision' | 'current';
  showArtist: boolean; showVisualMetadata: boolean;
}

export interface TierStyles { borderStyle: React.CSSProperties; verticalBorderStyle?: React.CSSProperties; backgroundStyle: React.CSSProperties; textStyle: React.CSSProperties; }

export const SHEETS_CONFIG = {
  csvUrl: 'https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/export?format=csv',
  songListGid: 113460815, changelogGid: 477178938, demonListGid: 95543877,
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxWyyhOQ3gTBuDLutem8vlywESzM7iXrkaAqJ-T0OA0HXbZfkPNLm6q9vEzYXCXqpfjCg/exec'
};

const TIER_PALETTE = ['#facc15', '#e879f9', '#8078F8', '#3878F8', '#38bdf8', '#22d3ee', '#2dd4bf', '#4ade80', '#a3e635', '#B2DE80', '#F8DE80', '#F8B680'];
export const TIER_ORDER = Object.values(Tier);
const TIER_COLOR_MAP = TIER_ORDER.reduce((a, t, i) => ({ ...a, [t]: TIER_PALETTE[i] || '#a3a3a3' }), {} as Record<Tier, string>);

// --- HELPERS ---
const clean = (t: any) => String(t || '').replace(/""/g, '"').replace(/^"|"$/g, '').trim();
export const normalizeTitle = (t: string) => { const c = clean(t).toLowerCase().replace(/[:_()\[\]"']/g, '').replace(/\s+/g, ' ').trim(); return c === 'strip' ? '牢獄strip' : c; };
export const parseExcelDate = (d: any) => d ? (/^\d{5}$/.test(d) ? new Date((d - 25569) * 864e5).toISOString().split('T')[0] : (isNaN(Date.parse(d)) ? d : new Date(Date.parse(d) + (d.includes(':') ? 0 : 432e5)).toISOString().split('T')[0])) : null;
export const formatDate = (d: any) => d instanceof Date ? d.toISOString().split('T')[0] : parseExcelDate(d) || '';

const parseCsv = (text: string) => {
  const rows: string[][] = []; let r: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (c === '"') q && n === '"' ? (f += '"', i++) : q = !q;
    else if (!q && c === ',') (r.push(f), f = '');
    else if (!q && (c === '\n' || c === '\r')) { if (c === '\r' && n === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; }
    else f += c;
  }
  return (f || r.length ? [...rows, [...r, f]] : rows);
};

const csvToJson = (rows: string[][]) => {
  const h = rows[0]?.map(x => x.toLowerCase().trim());
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(r => h.reduce((o, k, i) => ({ ...o, [k]: clean(r[i]) }), {} as any));
};

// --- API ---
const apiPost = (action: string, payload: any) => fetch(SHEETS_CONFIG.scriptUrl, { method: 'POST', body: JSON.stringify({ action, ...payload }) }).then(r => r.json()).then(res => {
  if (res.status === 'error' && res.message.includes('authenticate')) window.open(SHEETS_CONFIG.scriptUrl, 'auth', 'width=500,height=600');
  return res;
});

export const fetchSongData = async () => {
  const raw = csvToJson(parseCsv(await (await fetch(`${SHEETS_CONFIG.csvUrl}&gid=${SHEETS_CONFIG.songListGid}`)).text()));
  const tMap = new Map(), aMap = new Map(), rMap = new Map();
  const rawSongs = raw.filter(r => r.song).map((r, i) => {
    const n = normalizeTitle(r.song);
    if (r.image?.startsWith('http')) tMap.set(n, r.image);
    aMap.set(n, r.artist || 'N/A');
    if (r.remixer && r.remixer !== 'N/A') rMap.set(n, r.remixer);
    return { title: r.song, artist: r.artist || 'N/A', remixer: r.remixer, type: r['inst/vocal'] || 'Vocal', dateAdded: parseExcelDate(r['date added']), tier: r.tier, rank: parseInt(r['#'] || r.rank) || (i + 1), imageUrl: r.image || 'https://via.placeholder.com/128x72.png?text=No+Image', backgroundColor: r.background, link: r.link || r.url, duration: r.duration, isMain: r.main?.toUpperCase() === 'Y', isUnranked: r.main?.toUpperCase() === 'U' } as RawSong;
  });
  return { rawSongs, thumbnailMap: tMap, artistMap: aMap, remixerMap: rMap };
};

export const fetchDemonList = async () => ({ verified: csvToJson(parseCsv(await (await fetch(`${SHEETS_CONFIG.csvUrl}&gid=${SHEETS_CONFIG.demonListGid}`)).text())).map((r, i) => ({ name: r.name, creator: r.creator, thumbnail: r.image, list: r.list || 'Verified', rank: parseInt(r.rank || r['#'] || (i+1)) })).filter(l => l.name) });
export const saveSongData = (songs: RawSong[]) => apiPost('save_songs', { data: songs.map((s, i) => ({ "#": (!s.isMain && !s.isUnranked) ? "" : `=ROW(A${i+2})-1`, "SONG": s.title, "ARTIST": s.artist, "REMIXER": s.remixer||'', "INST/VOCAL": s.type, "Date Added": s.dateAdded||'', "TIER": s.tier, "MAIN": s.isMain?'Y':s.isUnranked?'U':'N', "BACKGROUND": s.backgroundColor||'', "DURATION": s.duration||'', "LINK": s.link||'', "IMAGE": s.imageUrl })) });
export const appendChangelog = (log: string[]) => log.length && apiPost('append_changelog', { content: `${new Date().getMonth()+1}/${new Date().getDate()} Changelog\n${log.join('\n')}` });

// --- HISTORY ---
export const parseHistoryData = (text: string, artMap: Map<string, string>) => {
  const rows = parseCsv(text), snaps: Snapshot[] = [], hMap = new Map<string, SongHistory>();
  let cur: SongEntry[] = [], d: Date | null = null;
  const flush = () => { if (d && cur.length) snaps.push({ date: d, songs: cur.map((s, i) => ({ ...s, rank: i+1 })) }); cur = []; d = null; };

  for (const r of rows) {
    const c0 = clean(r[0]), m = c0.match(/Song Rankings \((.*)\)/i);
    if (m) { flush(); d = new Date(m[1].replace(/, Version \d+/i, '').split(' ')[0]); }
    else if (r.some(c => c.toLowerCase().includes('changelog'))) { flush(); if (snaps.length) snaps.push(...applyChangelog(snaps[snaps.length-1], r.find(c => c.toLowerCase().includes('changelog'))!, artMap)); }
    else if (d && parseInt(c0) && r[1]) cur.push({ rank: parseInt(c0), title: clean(r[1]), artist: artMap.get(normalizeTitle(r[1])) || (r[2] !== 'N/A' ? clean(r[2]) : 'N/A') });
  }
  flush();
  snaps.sort((a,b) => a.date.getTime()-b.date.getTime()).forEach(snap => snap.songs.forEach(s => {
    const n = normalizeTitle(s.title), a = artMap.get(n) || s.artist;
    if (!hMap.has(n)) hMap.set(n, { key: `${n}-${a}`, title: s.title, artist: a, history: [], firstSeen: snap.date });
    const e = hMap.get(n)!, last = e.history[e.history.length-1];
    if (!last || last.rank !== s.rank) e.history.push({ date: snap.date, rank: s.rank, reason: s.reason || (last ? `Rank updated from #${last.rank} to #${s.rank}` : `${s.title} placed at #${s.rank}`), revisionLabel: snap.revisionLabel });
  }));
  return { snapshots: snaps, histories: Array.from(hMap.values()).sort((a,b) => a.title.localeCompare(b.title)) };
};

const applyChangelog = (base: Snapshot, log: string, map: Map<string, string>): Snapshot[] => {
  const lines = log.split('\n').filter(Boolean), snaps: Snapshot[] = [];
  let date = new Date(base.date), cur = base.songs.map(s => ({...s})), rev = 1;
  const dm = lines[0].match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dm) { let y = dm[3] ? parseInt(dm[3]) : base.date.getFullYear(); if (dm[3] && y < 100) y += 2000; date = new Date(y, parseInt(dm[1])-1, parseInt(dm[2])); }

  for (const line of lines) {
    if (line.toLowerCase().includes('changelog')) continue;
    let content = line, label, rd = new Date(date), tm = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (tm) { const parts = tm[0].match(/(\d+):(\d+)\s*(AM|PM)?/i); if (parts) { let hr = parseInt(parts[1]); if (parts[3]?.toUpperCase()==='PM' && hr<12) hr+=12; rd.setHours(hr, parseInt(parts[2])); } content = line.replace(tm[0], '').replace(/^[:|-]?\s*/, ''); }
    else { label = `Revision ${rev++}`; rd.setMilliseconds(rd.getMilliseconds()+rev); }

    const mv = content.match(/(.+) moved from #(\d+) to #(\d+)/i), pl = content.match(/(.+) placed at #(\d+)/i), rm = content.match(/(.+) removed/i), ents: ChangelogEntry[] = [];
    let histReason = '';

    if (mv) {
      const idx = cur.findIndex(s => normalizeTitle(s.title) === normalizeTitle(mv[1]));
      if (idx > -1) { 
        cur.splice(parseInt(mv[3])-1, 0, cur.splice(idx, 1)[0]); 
        histReason = `${clean(mv[1])} moved from #${mv[2]} to #${mv[3]}`;
        ents.push({ type: 'move', subjectTitle: clean(mv[1]), oldRank: parseInt(mv[2]), newRank: parseInt(mv[3]), description: `${histReason}, above ${cur[parseInt(mv[3])]?.title || 'end'} and below ${cur[parseInt(mv[3])-2]?.title || 'top'}` }); 
      }
    } else if (pl) {
      const ex = cur.findIndex(s => normalizeTitle(s.title) === normalizeTitle(pl[1])); if (ex > -1) cur.splice(ex, 1);
      cur.splice(Math.max(0, parseInt(pl[2])-1), 0, { rank: 0, title: clean(pl[1]), artist: map.get(normalizeTitle(pl[1])) || 'N/A' });
      histReason = `${clean(pl[1])} placed at #${pl[2]}`;
      ents.push({ type: 'place', subjectTitle: clean(pl[1]), newRank: parseInt(pl[2]), description: `${histReason}, above ${cur[parseInt(pl[2])]?.title || 'end'} and below ${cur[parseInt(pl[2])-2]?.title || 'top'}` });
    } else if (rm) {
      const subjects = rm[1].split(/ and /i).map(x => clean(x));
      subjects.forEach(t => { const idx = cur.findIndex(s => normalizeTitle(s.title) === normalizeTitle(t)); if (idx > -1) ents.push({ type: 'remove', subjectTitle: cur[idx].title, oldRank: idx+1, description: `${cur[idx].title} removed` }); });
      cur = cur.filter(s => !subjects.some(t => normalizeTitle(s.title) === normalizeTitle(t)));
      histReason = `${subjects.join(' and ')} removed`;
    }
    if (ents.length) snaps.push({ date: rd, songs: cur.map((s, i) => ({ ...s, rank: i+1, reason: histReason || s.reason })), revisionLabel: label, changelogEntries: ents });
  }
  return snaps;
};

export const downloadCsv = (n: string, h: string[], r: any[][]) => {
  const csv = [h.join(','), ...r.map(row => row.map(v => String(v ?? '').match(/,|"/) ? `"${String(v).replace(/"/g, '""')}"` : v).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = n; a.click();
};

// --- STYLES ---
const hslStr = (h: number, s: number, l: number, a = 1) => `hsla(${h%360}, ${Math.min(100, s*100)}%, ${Math.min(100, l*100)}%, ${a})`;
const genStyle = (hex: string, op = 0.95): TierStyles => {
  let r = parseInt(hex.slice(1,3), 16)/255, g = parseInt(hex.slice(3,5), 16)/255, b = parseInt(hex.slice(5,7), 16)/255, max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, l = (max+min)/2, s = d?(l>.5?d/(2-max-min):d/(max+min)):0, h = d?(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4):0;
  h *= 60; const mono = s < 0.1 || l > 0.95, bgH = mono ? 215 : h;
  return {
    borderStyle: { backgroundImage: `linear-gradient(to bottom right, ${hex}, ${hslStr(h, s*0.9, l+0.35)})`, backgroundColor: hex },
    verticalBorderStyle: { backgroundImage: `linear-gradient(to bottom, ${hex}, ${hslStr(h, s*0.9, l+0.35)})`, backgroundColor: hex },
    backgroundStyle: { backgroundImage: `linear-gradient(to right, ${hslStr(bgH, mono?.2:s*.6, (mono?.2:.16)-.15, op)}, ${hslStr(bgH, mono?.2:s*.6, (mono?.2:.16)+.3, op)})`, backgroundColor: hex },
    textStyle: { color: hslStr(h, s*1.05, l+0.1) }
  };
};
export const getTierStyles = (tier: Tier) => genStyle(TIER_COLOR_MAP[tier] || '#a3a3a3');
export const getGrayStyles = () => genStyle('#a3a3a3', 1.0);