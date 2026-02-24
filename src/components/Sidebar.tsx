import { useState, useMemo, useEffect } from 'react';
import { Clip } from '../types';
import { Folder, Film, CheckCircle, Clock, ExternalLink, Search, ArrowUpDown } from 'lucide-react';
import { openPath } from '@tauri-apps/plugin-opener';

interface SidebarProps {
    clips: Clip[];
    activeClipId: string | null;
    onSelectClip: (id: string) => void;
    onSelectFolder: () => void;
    workingFolder: string | null;
}

type SortOrder = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'status';

export function Sidebar({ clips, activeClipId, onSelectClip, onSelectFolder, workingFolder }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('status');

    const [sortMenuOpen, setSortMenuOpen] = useState(false);

    useEffect(() => {
        if (activeClipId) {
            // Need a slight delay to ensure the DOM has updated with the sorted/filtered items
            // especially if the activeClipId is set initially or when lists change.
            // Using requestAnimationFrame or setTimeout ensures we run after render.
            // But usually just running synchronously or with a small timeout works.
            const timeoutId = setTimeout(() => {
                const element = document.getElementById(`clip-${activeClipId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [activeClipId]);

    const filteredAndSortedClips = useMemo(() => {
        let result = [...clips];

        // Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(clip => clip.original_name.toLowerCase().includes(query));
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOrder) {
                case 'date_asc':
                    return a.created_at - b.created_at;
                case 'date_desc':
                    return b.created_at - a.created_at;
                case 'name_asc':
                    return a.original_name.localeCompare(b.original_name);
                case 'name_desc':
                    return b.original_name.localeCompare(a.original_name);
                case 'status':
                    // Custom order: in_progress First -> pending -> done
                    const statusWeight = (status: string) => {
                        if (status === 'in_progress') return 0;
                        if (status === 'done') return 2;
                        return 1; // pending
                    };
                    return statusWeight(a.status) - statusWeight(b.status);
                default:
                    return 0;
            }
        });

        return result;
    }, [clips, searchQuery, sortOrder]);

    const sortOptions: { value: SortOrder, label: string }[] = [
        { value: 'date_desc', label: 'Newest First' },
        { value: 'date_asc', label: 'Oldest First' },
        { value: 'name_asc', label: 'Name (A-Z)' },
        { value: 'name_desc', label: 'Name (Z-A)' },
        { value: 'status', label: 'By Status' },
    ];

    return (
        <div className="bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col w-full h-full text-zinc-300">
            <div className="p-3 mb-2 border-b border-[#2d2d2d]">
                <h1 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-4">
                    EXPLORER
                </h1>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onSelectFolder}
                        className="w-full flex items-center justify-center gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-200 py-1.5 px-3 rounded transition-colors text-xs border border-[#3d3d3d]"
                    >
                        <Folder size={14} />
                        {workingFolder ? 'Change Folder' : 'Open Folder...'}
                    </button>
                    {workingFolder && (
                        <button
                            onClick={() => openPath(`${workingFolder}/OUT`)}
                            className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-[#2d2d2d] text-zinc-300 py-1.5 px-3 rounded transition-colors text-xs border border-[#3d3d3d]"
                            title="Open export directory in file explorer"
                        >
                            <ExternalLink size={14} />
                            Open Trims
                        </button>
                    )}
                </div>
                {workingFolder && (
                    <p className="mt-2 text-[10px] text-zinc-500 truncate break-all font-mono" title={workingFolder}>
                        {workingFolder}
                    </p>
                )}
            </div>

            {/* Search and Sort Toolbar */}
            {workingFolder && (
                <div className="px-3 pb-2 flex items-center gap-2 border-b border-[#2d2d2d]">
                    <div className="relative flex-1 flex items-center">
                        <Search size={14} className="absolute left-2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder={`Find... (${clips.length} clips)`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1e1e1e] border border-[#3d3d3d] rounded pl-7 pr-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#007fd4] transition-colors placeholder:text-zinc-600 font-sans"
                        />
                    </div>
                    <div className="relative">
                        <div
                            onClick={() => setSortMenuOpen(!sortMenuOpen)}
                            className="flex justify-center items-center w-[26px] h-[26px] bg-[#1e1e1e] border border-[#3d3d3d] rounded cursor-pointer hover:bg-[#2d2d2d] hover:border-[#4d4d4d] transition-colors group shrink-0"
                            title="Sort Order"
                        >
                            <ArrowUpDown size={14} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                        </div>

                        {sortMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setSortMenuOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-32 bg-[#252526] border border-[#3d3d3d] rounded shadow-xl z-50 py-1 flex flex-col">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setSortOrder(option.value);
                                                setSortMenuOpen(false);
                                            }}
                                            className={`text-left px-3 py-1.5 text-xs transition-colors hover:bg-[#007fd4] hover:text-white ${sortOrder === option.value ? 'text-[#4cb3ff] bg-[#37373d]' : 'text-zinc-300'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto w-full py-1 custom-scrollbar">
                {clips.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4 italic px-4">No clips found in folder</p>
                ) : filteredAndSortedClips.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4 italic px-4">No files match your search</p>
                ) : (
                    filteredAndSortedClips.map((clip) => (
                        <button
                            key={clip.id}
                            id={`clip-${clip.id}`}
                            onClick={() => onSelectClip(clip.id)}
                            className={`w-full text-left px-4 py-1.5 flex items-center gap-2 cursor-pointer transition-colors outline-none focus:outline-none ${activeClipId === clip.id
                                ? 'bg-[#37373d] text-zinc-100' // active vscode file color
                                : 'hover:bg-[#2a2d2e] text-zinc-400'
                                }`}
                        >
                            {clip.status === 'done' ? (
                                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                            ) : clip.status === 'in_progress' ? (
                                <Clock size={14} className="text-amber-500 shrink-0" />
                            ) : (
                                <Film size={14} className="text-zinc-500 shrink-0" />
                            )}
                            <span className="truncate text-[13px] font-mono">{clip.original_name}</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
