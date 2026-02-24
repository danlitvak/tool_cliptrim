import { Segment } from '../types';
import { Trash2, Edit2, Play } from 'lucide-react';

interface SegmentListProps {
    segments: Segment[];
    onDelete: (id: string) => void;
    onUpdateLabel: (id: string, label: string) => void;
    onUpdateBounds: (id: string, startMs: number, endMs: number) => void;
    onSeek: (timeMs: number) => void;
}

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frames = Math.floor((ms % 1000) / (1000 / 30)); // Assuming ~30fps for display purposes
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
};

export function SegmentList({ segments, onDelete, onUpdateLabel, onSeek }: SegmentListProps) {
    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] border-l border-[#2d2d2d] w-full text-zinc-300">
            <div className="px-3 py-2 border-b border-[#2d2d2d]">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest flex justify-between items-center">
                    SEGMENTS
                    <span className="bg-[#2d2d2d] text-zinc-400 text-[10px] py-0.5 px-2 rounded normal-case tracking-normal">{segments.length}</span>
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                {segments.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4 italic px-4">No segments yet.</p>
                ) : (
                    <div className="flex flex-col">
                        {segments.map((seg, i) => (
                            <div key={seg.id} className="group relative border-b border-[#2d2d2d] hover:bg-[#252526] transition-colors p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono font-semibold text-zinc-300">Segment #{i + 1}</span>
                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onSeek(seg.start_ms)} title="Go to Start" className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#3d3d3d] rounded transition-colors">
                                            <Play size={14} />
                                        </button>
                                        <button onClick={() => onDelete(seg.id)} title="Delete Segment" className="p-1 text-zinc-400 hover:text-[#f14c4c] hover:bg-[#3d3d3d] rounded transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                                    <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-zinc-300">{formatTime(seg.start_ms)}</span>
                                    <span className="text-zinc-600">→</span>
                                    <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-zinc-300">{formatTime(seg.end_ms)}</span>
                                    <span className="ml-auto text-[10px] text-zinc-500">{((seg.end_ms - seg.start_ms) / 1000).toFixed(2)}s</span>
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    <Edit2 size={12} className="text-zinc-500 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Label (optional)"
                                        value={seg.label || ''}
                                        onChange={(e) => onUpdateLabel(seg.id, e.target.value)}
                                        className="bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-[#007fd4] text-zinc-300 placeholder-zinc-600 font-sans"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
