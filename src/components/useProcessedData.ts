
import { useMemo } from 'react';
import { Song, RawSong, SongHistory, normalizeTitle, calculateTierScores } from '../utils';

const DEMON_LIST_HIERARCHY = ["Pointercrate", "Verified", "Verification Progress", "Completed", ">50% Complete", "<50% Complete", "0% Complete"];

export const useProcessedData = ({ data, settings, viewState, demonListType, demonListFilter }: any) => {
    const { rawSongs, snapshots, histories, thumbnailMap, loading } = data;

    // 1. Fundamental Maps for O(1) lookups
    const rawMap = useMemo(() => new Map<string, RawSong>(rawSongs.map((s: any) => [normalizeTitle(s.title), s])), [rawSongs]);
    const historyMap = useMemo(() => new Map<string, SongHistory>(histories.map((h: any) => [normalizeTitle(h.title), h])), [histories]);

    const remixerMap = useMemo(() => {
        const m = new Map<string, string>(data.remixerMap);
        rawSongs.forEach((s: any) => s.remixer?.trim() && s.remixer !== 'N/A' && m.set(normalizeTitle(s.title), s.remixer));
        return m;
    }, [rawSongs, data.remixerMap]);

    const uniqueArtists = useMemo(() => {
        const set = new Set<string>();
        rawSongs.forEach((s: any) => s.artist && s.artist !== 'N/A' && set.add(s.artist));
        histories.forEach((h: any) => h.artist && h.artist !== 'N/A' && set.add(h.artist));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rawSongs, histories]);

    // 2. Primary List Definitions
    const mainSongs = useMemo(() => rawSongs.filter((s: any) => s.isMain).sort((a: any, b: any) => a.rank - b.rank), [rawSongs]);
    const unrankedSongs = useMemo(() => rawSongs.filter((s: any) => s.isUnranked).sort((a: any, b: any) => (new Date(a.dateAdded || 0).getTime()) - (new Date(b.dateAdded || 0).getTime())), [rawSongs]);

    const legacySongs = useMemo(() => {
        if (loading || !rawSongs.length) return [];
        const currentSet = new Set(mainSongs.map((s: any) => normalizeTitle(s.title)));
        const unrankedSet = new Set(unrankedSongs.map((s: any) => normalizeTitle(s.title)));
        
        const lastSeenMap = new Map<string, number>();
        snapshots.forEach((snap: any) => snap.songs.forEach((s: any) => lastSeenMap.set(normalizeTitle(s.title), snap.date.getTime())));

        return histories
            .filter((h: any) => !currentSet.has(normalizeTitle(h.title)) && !unrankedSet.has(normalizeTitle(h.title)))
            .map((h: any) => {
                const n = normalizeTitle(h.title), r = rawMap.get(n);
                const lastTime = lastSeenMap.get(n) || 0;
                return {
                    ...r, title: h.title, artist: h.artist, isLegacy: true, isMain: false, rank: 0,
                    imageUrl: thumbnailMap.get(n) || 'https://via.placeholder.com/128x72.png?text=No+Image',
                    removedDate: new Date(lastTime),
                    lastSeenTime: lastTime,
                    lastRank: h.history[h.history.length - 1]?.rank || 9999
                } as Song;
            })
            .sort((a: any, b: any) => (b.lastSeenTime - a.lastSeenTime) || (a.lastRank - b.lastRank));
    }, [histories, mainSongs, unrankedSongs, snapshots, loading, rawMap, thumbnailMap]);

    // 3. Displayed List Logic
    const displayedSongs = useMemo(() => {
        if (loading || !rawSongs.length) return [];
        let base: Song[] = [];
        const scores = calculateTierScores(mainSongs);

        if (settings.showRevisionHistory && snapshots.length > 0) {
            const snap = snapshots[settings.selectedRevisionIndex];
            if (!snap) return [];

            const currRankMap = new Map<string, number>(mainSongs.map((s: any) => [normalizeTitle(s.title), s.rank]));
            const surviving = snap.songs.filter((s: any) => currRankMap.has(normalizeTitle(s.title)));
            const histRelMap = new Map<string, number>(surviving.map((s: any, i: number) => [normalizeTitle(s.title), i + 1]));
            
            const currRelMap = new Map<string, number>([...surviving].sort((a: any, b: any) => {
                const aVal = currRankMap.get(normalizeTitle(a.title)) || 999;
                const bVal = currRankMap.get(normalizeTitle(b.title)) || 999;
                return aVal - bVal;
            }).map((s, i) => [normalizeTitle(s.title), i + 1]));

            base = snap.songs.map((s: any) => {
                const n = normalizeTitle(s.title), r = rawMap.get(n), h = historyMap.get(n);
                return {
                    ...r, ...s, imageUrl: thumbnailMap.get(n) || 'https://via.placeholder.com/128x72.png?text=No+Image',
                    tier: r?.tier || (h ? 'B' : 'B-'),
                    score: scores.get(n),
                    currentRank: currRankMap.get(n),
                    relativeHistoricalRank: histRelMap.get(n),
                    relativeCurrentRank: currRelMap.get(n)
                } as Song;
            });
            if (settings.revisionSortMode === 'current') base.sort((a, b) => (a.currentRank || 9e5) - (b.currentRank || 9e5));
        } else {
            const sep = (t: string) => ({ title: t, isSeparator: true, rank: 0, tier: 'B-' } as any);
            const mainWithScores = mainSongs.map(s => ({ ...s, score: scores.get(normalizeTitle(s.title)) }));
            
            base = settings.showAllSongs 
                ? [...mainWithScores, sep("LEGACY LIST"), ...legacySongs, sep("UNRANKED LIST"), ...unrankedSongs]
                : mainWithScores;
        }

        let filtered = base.filter(s => s.isSeparator || (
            (settings.songTypeFilter === 'all' || s.type === settings.songTypeFilter) &&
            (settings.artistFilter === 'all' || s.artist === settings.artistFilter)
        ));

        if (settings.rankDisplayMode === 'group' && settings.songTypeFilter !== 'all' && !settings.showRevisionHistory) {
            filtered = filtered.map((s, i) => s.isSeparator ? s : ({ ...s, rank: i + 1 }));
        }

        if (settings.sortMode === 'title') {
            filtered.sort((a, b) => a.isSeparator ? 1 : b.isSeparator ? -1 : a.title.localeCompare(b.title));
        } else if (settings.sortMode === 'date') {
            filtered.sort((a, b) => a.isSeparator ? 1 : b.isSeparator ? -1 : (new Date(a.dateAdded || 0).getTime() - new Date(b.dateAdded || 0).getTime()));
        }

        return filtered;
    }, [mainSongs, snapshots, rawSongs, histories, settings, loading, legacySongs, unrankedSongs, rawMap, historyMap, thumbnailMap]);

    // 4. Demon List & Totals
    const displayedDemonLevels = useMemo(() => {
        const levels = data.demonLevels.verified || [];
        const filterIdx = DEMON_LIST_HIERARCHY.indexOf(demonListFilter);
        
        // Filter based on the hierarchy string.
        // If "Pointercrate" is selected (idx 0), levelIdx must be 0.
        // If "Verified" is selected (idx 1), levelIdx must be 0 or 1.
        // This makes ranks relative to that specific sub-collection.
        const hierarchicalFiltered = levels
            .filter((l: any) => {
                const levelIdx = DEMON_LIST_HIERARCHY.indexOf(l.list);
                return levelIdx !== -1 && levelIdx <= filterIdx;
            })
            // Map relative rank to each filtered item so they display as 1, 2, 3... in the selected view
            .map((l: any, i: number) => ({ ...l, rank: i + 1 }));

        if (demonListType === 'main') return hierarchicalFiltered.slice(0, 75);
        if (demonListType === 'extended') return hierarchicalFiltered.slice(75, 150);
        if (demonListType === 'all') return hierarchicalFiltered.slice(0, 150); // Cap "Full List" at 150
        return hierarchicalFiltered;
    }, [data.demonLevels, demonListType, demonListFilter]);

    const currentMaxEntries = useMemo(() => {
        if (viewState.selectedHistorySong) return undefined;
        const counts: Record<string, number | undefined> = { 
            visual: displayedSongs.length, 
            demonlist: displayedDemonLevels.length, 
            'history-top1': snapshots.length, 
            'history-changelog': snapshots.filter((s: any) => s.changelogEntries?.length).length 
        };
        return counts[viewState.active as string];
    }, [viewState.active, viewState.selectedHistorySong, displayedSongs.length, displayedDemonLevels.length, snapshots]);

    return {
        displayedSongs,
        displayedDemonLevels,
        uniqueArtists,
        remixerMap,
        historyMap,
        currentMaxEntries,
        globalNavigationList: [...mainSongs, { title: "LEGACY", isSeparator: true } as any, ...legacySongs, { title: "UNRANKED", isSeparator: true } as any, ...unrankedSongs],
        selectedSongMetadata: viewState.selectedHistorySong ? rawMap.get(normalizeTitle(viewState.selectedHistorySong.title)) : undefined
    };
};
