import React from 'react';

// --- TYPES & CONSTANTS ---
export const Tier = { SPlus:'S+',S:'S',APlusPlus:'A++',APlus:'A+',A:'A',AMinus:'A-',BPlus:'B+',B:'B',BMinus:'B-' } as const;
export type Tier = typeof Tier[keyof typeof Tier];
export type ViewMode = 'visual' | 'stats' | 'demonlist' | 'changelog';
export type LayoutMode = 'standard' | 'compact' | 'grid';
export type DemonListType = 'main' | 'extended' | 'all';

export interface SongEntry { rank: number; title: string; artist: string; reason?: string; }
export interface DemonLevel { rank: number; name: string; creator: string; thumbnail: string; list: string; }
export interface RawSong { imageUrl: string; title: string; artist: string; remixer: string|null; type: 'Vocal'|'Instrumental'; dateAdded: string|null; tier: Tier; rank: number; isMain: boolean; isUnranked?: boolean; backgroundColor: string|null; link: string|null; duration: string|null; }
export interface Song extends RawSong { isLegacy?: boolean; isSeparator?: boolean; removedDate?: Date; lastRank?: number; modernStatus?: string; }
export interface ChangelogEntry { date: string; time: string; song: string; artist: string; type: 'Placement'|'Movement'|'Removal'|'Swap'|'Clear'|'Snapshot'; old: number; new: number; timestamp: number; }
export interface DisplaySettings { showDetails: boolean; hideTierText: boolean; hideTierVisuals?: boolean; isCompact: boolean; layoutMode: LayoutMode; font: 'verdana'|'montserrat'|'orbitron'; songTypeFilter: 'all'|'Vocal'|'Instrumental'; tierFilter: string; artistFilter: string; rankDisplayMode: 'original'|'group'; sortMode: 'rank'|'title'|'date'; historyFilterDate: Date; showAllSongs: boolean; showArtist: boolean; showVisualMetadata: boolean; historyPoint: string; }
export interface TierStyles { borderStyle: React.CSSProperties; verticalBorderStyle?: React.CSSProperties; backgroundStyle: React.CSSProperties; textStyle: React.CSSProperties; }

export const SHEETS_CONFIG = { csvUrl: 'https://docs.google.com/spreadsheets/d/1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q/export?format=csv', songListGid: 113460815, demonListGid: 95543877, changelogGid: 477178938 };
export const TIER_ORDER = Object.values(Tier);
const TIER_COLORS = ['#facc15','#e879f9','#8078F8','#3878F8','#38bdf8','#22d3ee','#2dd4bf','#4ade80','#a3e635','#B2DE80','#F8DE80','#F8B680'];
const TIER_COLOR_MAP = TIER_ORDER.reduce((a, t, i) => ({ ...a, [t]: TIER_COLORS[i]||'#a3a3a3' }), {} as Record<Tier, string>);

// --- HELPERS ---
const clean = (t: any) => String(t||'').replace(/""/g,'"').replace(/^"|"$/g,'').trim();
export const normalizeTitle = (t: string) => { const c = clean(t).toLowerCase().replace(/[:_()\[\]"']/g,'').replace(/\s+/g,' ').trim(); return c==='strip'?'牢獄strip':c; };
export const getCompositeKey = (t: string, a?: string) => `${normalizeTitle(t)}::${normalizeTitle(a||'')}`;

export const parseExcelDate = (d: any) => {
  if (!d) return null;
  const s = String(d), n = parseInt(s);
  if (/^\d{5}$/.test(s)) return new Date((n - 25569) * 864e5).toISOString().split('T')[0];
  const p = Date.parse(s);
  return isNaN(p) ? s : new Date(p + (s.includes(':') ? 0 : 432e5)).toISOString().split('T')[0];
};
export const formatDate = (d: any) => (d instanceof Date && !isNaN(d.getTime())) ? d.toISOString().split('T')[0] : (parseExcelDate(d)||'');

const parseCsv = (txt: string) => {
  const res: string[][] = []; let row: string[] = [], buf = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i], n = txt[i+1];
    if (c === '"') q && n === '"' ? (buf += '"', i++) : q = !q;
    else if (!q && c === ',') (row.push(buf), buf = '');
    else if (!q && (c === '\n' || c === '\r')) { if (c === '\r' && n === '\n') i++; row.push(buf); res.push(row); row = []; buf = ''; }
    else buf += c;
  }
  return buf || row.length ? [...res, [...row, buf]] : res;
};

const csvToJson = (rows: string[][]) => {
  const h = rows[0]?.map(x => x.toLowerCase().trim());
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(r => h.reduce((o, k, i) => ({ ...o, [k]: clean(r[i]) }), {} as any));
};

const get = async (gid: number) => csvToJson(parseCsv(await (await fetch(`${SHEETS_CONFIG.csvUrl}&gid=${gid}`)).text()));

// --- API ---
export const fetchSongData = async () => {
  const raw = await get(SHEETS_CONFIG.songListGid);
  const maps = { thumbnailMap: new Map(), artistMap: new Map(), remixerMap: new Map(), typeMap: new Map(), linkMap: new Map(), dateMap: new Map(), durationMap: new Map(), titleToArtistMap: new Map() };
  
  const rawSongs = raw.filter(r => r.song).map((r, i) => {
    const ck = getCompositeKey(r.song, r.artist), img = r.image?.startsWith('http') ? r.image : 'https://via.placeholder.com/128x72.png?text=No+Image';
    if (r.image?.startsWith('http')) maps.thumbnailMap.set(ck, r.image);
    maps.artistMap.set(ck, r.artist||'N/A'); maps.typeMap.set(ck, r['inst/vocal']||'Vocal');
    if (r.remixer && r.remixer!=='N/A') maps.remixerMap.set(ck, r.remixer);
    maps.linkMap.set(ck, r.link||r.url); maps.dateMap.set(ck, parseExcelDate(r['date added'])); maps.durationMap.set(ck, r.duration);
    if (!maps.titleToArtistMap.has(normalizeTitle(r.song))) maps.titleToArtistMap.set(normalizeTitle(r.song), r.artist||'N/A');

    return { title: r.song, artist: r.artist||'N/A', remixer: r.remixer, type: r['inst/vocal']||'Vocal', dateAdded: parseExcelDate(r['date added']), tier: r.tier, rank: parseInt(r['#']||r.rank)||(i+1), imageUrl: img, backgroundColor: r.background, link: r.link||r.url, duration: r.duration, isMain: r.main?.toUpperCase()==='Y', isUnranked: r.main?.toUpperCase()==='U' } as RawSong;
  });
  return { rawSongs, ...maps };
};

export const fetchChangelog = async () => (await get(SHEETS_CONFIG.changelogGid)).map((r: any) => {
  const d = parseExcelDate(r.date)||'', t = r.time||'00:00';
  return { date: d, time: t, song: r.song, artist: r.artist, type: r.type, old: parseInt(r.old)||0, new: parseInt(r.new)||0, timestamp: new Date(`${d} ${t}`).getTime()||0 } as ChangelogEntry;
}).sort((a, b) => a.timestamp - b.timestamp);

export const fetchDemonList = async () => ({ verified: (await get(SHEETS_CONFIG.demonListGid)).map((r, i) => ({ name: r.name, creator: r.creator, thumbnail: r.image, list: r.list||'Verified', rank: parseInt(r.rank||r['#']||(i+1)) })).filter(l => l.name) });

// --- STYLES ---
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h%360},${Math.min(100,s*100)}%,${Math.min(100,l*100)}%,${a})`;
const genStyle = (hex: string, op = 0.95): TierStyles => {
  const [r, g, b] = [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d ? (l > 0.5 ? d / (2 - max - min) : d / (max + min)) : 0;
  let h = d ? (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 : 0;
  const mono = s < 0.1 || l > 0.95, bgH = mono ? 215 : h;
  return {
    borderStyle: { backgroundImage: `linear-gradient(to bottom right, ${hex}, ${hsl(h, s * 0.9, l + 0.35)})`, backgroundColor: hex },
    verticalBorderStyle: { backgroundImage: `linear-gradient(to bottom, ${hex}, ${hsl(h, s * 0.9, l + 0.35)})`, backgroundColor: hex },
    backgroundStyle: { backgroundImage: `linear-gradient(to right, ${hsl(bgH, mono?.2:s*.6, (mono?.2:.16)-.15, op)}, ${hsl(bgH, mono?.2:s*.6, (mono?.2:.16)+.3, op)})`, backgroundColor: hex },
    textStyle: { color: hsl(h, s * 1.05, l + 0.1) }
  };
};
export const getTierStyles = (tier: Tier) => genStyle(TIER_COLOR_MAP[tier] || '#a3a3a3');
export const getGrayStyles = () => genStyle('#a3a3a3', 1.0);