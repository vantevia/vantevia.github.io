import { useMemo } from 'react';
import { normalizeTitle as nt, getCompositeKey as gk } from '../utils';

const DL_HIER = ["Pointercrate", "Verified", "Verification Progress", "Completed", ">50% Complete", "<50% Complete", "0% Complete"];

export const useProcessedData = ({ data: d, settings: s, viewState: vs, demonListType: dt, demonListFilter: df }: any) => {
    const { rawSongs: raw, loading: l, changelog: cl } = d;

    const uniqueArtists = useMemo(() => [...new Set((raw||[]).filter((r:any)=>r.artist && r.artist!=='N/A').map((r:any)=>r.artist))].sort((a:any,b:any)=>a.localeCompare(b)), [raw]);

    const main = useMemo(() => raw.filter((r:any)=>r.isMain).sort((a:any,b:any)=>a.rank-b.rank), [raw]);
    const unranked = useMemo(() => raw.filter((r:any)=>r.isUnranked).map((r:any)=>({...r, tier:undefined})).sort((a:any,b:any)=>(new Date(a.dateAdded||0).getTime())-(new Date(b.dateAdded||0).getTime())), [raw]);
    const legacy = useMemo(() => (l||!raw.length) ? [] : raw.filter((r:any)=>!r.isMain&&!r.isUnranked).map((r:any)=>({...r, isLegacy:true, isMain:false, tier:undefined, removedDate:new Date(), lastSeenTime:Date.now(), lastRank:9999})).sort((a:any,b:any)=>a.rank-b.rank), [raw, l]);

    const displayedSongs = useMemo(() => {
        if (l || !raw.length) return [];
        let list = s.showAllSongs ? [...main, ...legacy, ...unranked].map((x, i) => ({ ...x, rank: x.rank || (i + 1) })) : [...main];

        list = list.filter(x => x.isSeparator || (
            (s.songTypeFilter === 'all' || x.type === s.songTypeFilter) &&
            (s.artistFilter === 'all' || x.artist === s.artistFilter) &&
            (s.tierFilter === 'all' || x.tier === s.tierFilter)
        ));

        if (s.rankDisplayMode === 'group' && s.songTypeFilter !== 'all') list = list.map((x, i) => x.isSeparator ? x : ({ ...x, rank: i + 1 }));

        if (s.sortMode === 'title') list.sort((a, b) => a.isSeparator ? 1 : b.isSeparator ? -1 : a.title.localeCompare(b.title));
        else if (s.sortMode === 'date') list.sort((a, b) => a.isSeparator ? 1 : b.isSeparator ? -1 : (new Date(a.dateAdded || 0).getTime() - new Date(b.dateAdded || 0).getTime()));

        return list;
    }, [main, l, legacy, unranked, s]);

    const displayedDemonLevels = useMemo(() => {
        const lvl = d.demonLevels.verified || [], idx = DL_HIER.indexOf(df);
        const res = lvl.filter((l:any) => { const i = DL_HIER.indexOf(l.list); return i !== -1 && i <= idx; }).map((l:any, i:number) => ({ ...l, rank: i + 1 }));
        return dt === 'main' ? res.slice(0, 75) : dt === 'extended' ? res.slice(75, 150) : res.slice(0, 150);
    }, [d.demonLevels, dt, df]);

    const historyList = useMemo(() => {
        if (!cl || !d.thumbnailMap) return [];
        const ts = new Date(s.historyPoint).getTime();
        let l: any[] = [], lTs = -1;
        for (const e of cl.filter((x:any)=>x.timestamp <= ts)) {
            const ta = e.artist||d.titleToArtistMap.get(nt(e.song))||'N/A', k = gk(e.song, ta);
            const sObj: any = { title: e.song, artist: d.artistMap.get(k)||ta, remixer: d.remixerMap.get(k)||'N/A', type: d.typeMap.get(k)||'Vocal', imageUrl: d.thumbnailMap.get(k)||'https://via.placeholder.com/128x72.png?text=No+Image', link: d.linkMap.get(k), dateAdded: d.dateMap.get(k), duration: d.durationMap.get(k), modernStatus: 'History', isMain: true, rank: e.new };
            const tIdx = Math.max(0, Math.min(l.length, e.new - 1));

            if (e.type === 'Snapshot' && e.new > 0) {
                if (lTs !== e.timestamp) { l = []; lTs = e.timestamp; }
                l = l.filter(x => gk(x.title, x.artist) !== k); l.splice(tIdx, 0, sObj);
            } else if ((e.type === 'Placement' || e.type === 'Movement') && e.new > 0) {
                l = l.filter(x => gk(x.title, x.artist) !== k); l.splice(tIdx, 0, sObj);
            } else if (e.type === 'Removal') {
                const i = l.findIndex(x => gk(x.title, x.artist) === k); if (i !== -1) l.splice(i, 1);
            } else if (e.type === 'Swap') {
                const i = l.findIndex(x => gk(x.title, x.artist) === k);
                if (i > 0) { [l[i], l[i-1]] = [l[i-1], l[i]]; }
            } else if (e.type === 'Clear') l = [];
        }
        return l.map((x, i) => ({ ...x, rank: i + 1 }));
    }, [cl, s.historyPoint, d]);

    return {
        displayedSongs, displayedDemonLevels, uniqueArtists, historyList,
        currentMaxEntries: { visual: displayedSongs.length, demonlist: displayedDemonLevels.length, changelog: historyList.length }[vs.active as string],
        globalNavigationList: [...main, { title: "legacy", isSeparator: true }, ...legacy, { title: "unranked", isSeparator: true }, ...unranked]
    };
};