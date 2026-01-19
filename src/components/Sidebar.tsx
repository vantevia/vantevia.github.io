import React from 'react';
import { SettingsMenu } from './SettingsMenu';
import { ViewMode, DemonListType, DisplaySettings, Snapshot, SongHistory } from '../utils';

interface SidebarProps {
    viewState: { active: ViewMode; selectedHistorySong: SongHistory | null };
    settings: DisplaySettings;
    demonListType: DemonListType;
    dataSnapshots: Snapshot[];
    uniqueArtists: string[];
    isSaving: boolean;
    isCopying: boolean;
    onNavTo: (mode: ViewMode) => void;
    onSetDemonListType: (type: DemonListType) => void;
    onSetSettings: (s: React.SetStateAction<DisplaySettings>) => void;
    onRequestCapture: (action: 'save' | 'copy') => void;
    onExportCsv: () => void;
    onClearHistorySelection: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { viewState, settings, demonListType, dataSnapshots, uniqueArtists, isSaving, isCopying, onNavTo, onSetDemonListType, onSetSettings, onRequestCapture, onExportCsv, onClearHistorySelection } = props;

    const labels: Partial<Record<ViewMode, string>> = { visual: 'Revamp', stats: 'Statistics', comparison: 'Comparisons', 'history-top1': 'Top 1 History', 'history-changelog': 'Changelog' };

    const NavBtn = ({ mode, label, color = "sky" }: { mode: ViewMode, label: string, color?: string }) => {
        const active = viewState.active === mode && !viewState.selectedHistorySong;
        return (
            <button onClick={() => onNavTo(mode)} className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${active ? `bg-${color}-600 text-white` : 'text-slate-400 hover:bg-slate-800'}`}>
                {label}
            </button>
        );
    };

    const Section = ({ title }: { title: string }) => (
        <div className="p-4 border-y border-slate-700/50 bg-slate-800/40 font-bold text-gray-200 text-xs uppercase tracking-tight">{title}</div>
    );

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 sticky top-6 z-10 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto pr-1">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-xl shrink-0">
                {(['visual', 'stats', 'comparison'] as ViewMode[]).map(m => <NavBtn key={m} mode={m} label={labels[m]!} />)}
                
                <button onClick={() => { onNavTo('demonlist'); if(!['main','extended','all'].includes(demonListType)) onSetDemonListType('main'); }} 
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${viewState.active === 'demonlist' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Verified Levels List
                </button>
                
                {viewState.active === 'demonlist' && (
                    <div className="flex flex-col bg-slate-900/30 pb-2">
                        {[ {l:'Main List', v:'main'}, {l:'Extended List', v:'extended'}, {l:'Full List', v:'all'} ].map(t => (
                            <button key={t.v} onClick={() => { onSetDemonListType(t.v as any); window.scrollTo({top:0, behavior:'instant'}); }} 
                                className={`w-full text-left pl-8 pr-4 py-2 text-xs font-bold transition-colors border-l-2 ${demonListType === t.v ? 'border-sky-500 text-sky-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                {t.l}
                            </button>
                        ))}
                    </div>
                )}

                <Section title="History" />
                {(['history-top1', 'history-changelog'] as ViewMode[]).map(m => <NavBtn key={m} mode={m} label={labels[m]!} />)}
                
                <Section title="Admin" />
                <NavBtn mode="editor" label="Data Editor" color="purple" />
            </div>

            <SettingsMenu 
                settings={settings} 
                onSettingChange={(k, v) => onSetSettings(p => ({ ...p, [k]: v }))} 
                onSave={() => onRequestCapture('save')} isSaving={isSaving} 
                onCopy={() => onRequestCapture('copy')} isCopying={isCopying} 
                snapshots={dataSnapshots}
                uniqueArtists={uniqueArtists}
            />

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 shrink-0">
                <button onClick={viewState.selectedHistorySong ? onClearHistorySelection : onExportCsv} 
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${viewState.selectedHistorySong ? 'text-gray-300 hover:bg-slate-700 flex gap-2' : 'text-emerald-400 hover:bg-emerald-900/20'}`}>
                    {viewState.selectedHistorySong ? '← Back' : 'Export CSV'}
                </button>
            </div>
        </aside>
    );
};