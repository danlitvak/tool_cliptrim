import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Segment } from '../types';
import { ZoomIn, ZoomOut, Maximize, VolumeX, Volume2 } from 'lucide-react';

interface TimelineProps {
    durationMs: number;
    currentTimeMs: number;
    inMarker: number | null;
    outMarker: number | null;
    segments: Segment[];
    onSeek: (timeMs: number) => void;
    volume?: number;
    isMuted?: boolean;
    playbackRate?: number;
    onVolumeChange?: (volume: number) => void;
    onMuteChange?: (isMuted: boolean) => void;
    isEditMode: boolean;
}

export function Timeline({
    durationMs, currentTimeMs, inMarker, outMarker, segments, onSeek,
    volume = 1, isMuted = false, playbackRate = 1, onVolumeChange, onMuteChange, isEditMode
}: TimelineProps) {
    const [zoomLevel, setZoomLevel] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevZoomRef = useRef(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, scrollLeft: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning.current || !containerRef.current) return;
            e.preventDefault();
            const dx = e.clientX - panStart.current.x;
            containerRef.current.scrollLeft = panStart.current.scrollLeft - dx;
        };

        const handleMouseUp = () => {
            if (isPanning.current) {
                isPanning.current = false;
                document.body.style.cursor = '';
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // Keep playhead in view when it moves, if it goes out of bounds
    useLayoutEffect(() => {
        if (!containerRef.current || durationMs <= 0) return;
        const container = containerRef.current;
        const playheadPercent = currentTimeMs / durationMs;
        const playheadPixelX = playheadPercent * (container.scrollWidth);
        const clientWidth = container.clientWidth;

        if (prevZoomRef.current !== zoomLevel) {
            // Zoom changed! Keep playhead focused by centering it exactly synchronously
            container.scrollLeft = Math.max(0, playheadPixelX - clientWidth / 2);
            prevZoomRef.current = zoomLevel;
            return;
        }

        const scrollLeft = container.scrollLeft;

        // If playhead is outside the visible area, instantly update it to center to avoid smoothing jitter
        if (playheadPixelX < scrollLeft || playheadPixelX > scrollLeft + clientWidth) {
            container.scrollLeft = Math.max(0, playheadPixelX - clientWidth / 2);
        }
    }, [currentTimeMs, durationMs, zoomLevel]);
    const getPositionStyle = (timeMs: number) => {
        const percent = durationMs > 0 ? (timeMs / durationMs) * 100 : 0;
        return { left: `${Math.min(100, Math.max(0, percent))}%` };
    };

    const getWidthStyle = (startMs: number, endMs: number) => {
        const startPercent = durationMs > 0 ? (startMs / durationMs) * 100 : 0;
        const endPercent = durationMs > 0 ? (endMs / durationMs) * 100 : 0;
        return {
            left: `${Math.min(100, Math.max(0, startPercent))}%`,
            width: `${Math.min(100, Math.max(0, endPercent - startPercent))}%`,
        };
    };

    return (
        <div className="flex flex-col bg-[#1e1e1e] border-t border-[#3d3d3d] select-none h-full w-full shadow-[0_-4px_10px_rgba(0,0,0,0.3)] z-40 relative">
            {/* Timeline Toolbar */}
            <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#3d3d3d] relative">
                <div className="flex items-center gap-4">
                    {/* Audio Controls */}
                    {onVolumeChange && onMuteChange && (
                        <div className="flex items-center gap-2 pr-4 border-r border-[#3d3d3d]">
                            <button
                                onClick={() => onMuteChange(!isMuted)}
                                className="text-zinc-400 hover:text-zinc-100 transition-colors pointer-events-auto"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    onVolumeChange(parseFloat(e.target.value));
                                    if (isMuted) onMuteChange(false);
                                }}
                                className="w-16 h-1 bg-[#2d2d2d] rounded-lg appearance-none cursor-pointer accent-[#0e639c] pointer-events-auto"
                                title="Volume"
                            />
                        </div>
                    )}
                    {/* Timer & Speed */}
                    <div className="flex items-center gap-3">
                        <div className="text-[11px] font-mono text-zinc-300">
                            {durationMs > 0 ? (currentTimeMs / 1000).toFixed(3) : "0.000"}s / {(durationMs / 1000).toFixed(3)}s
                        </div>
                        <div className="text-[10px] font-mono font-bold text-[#007fd4] bg-[#007fd4]/10 px-1.5 py-0.5 rounded">
                            {playbackRate.toFixed(2)}x
                        </div>
                    </div>
                </div>

                {/* Edit Mode Indicator */}
                {isEditMode && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs font-bold tracking-widest pointer-events-none">
                        EDIT MODE
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoomLevel(1)}
                        className="p-1 hover:bg-[#3d3d3d] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                        title="Fit to Screen"
                    >
                        <Maximize size={14} />
                    </button>
                    <button
                        onClick={() => setZoomLevel(prev => Math.max(1, prev / 1.5))}
                        className="p-1 hover:bg-[#3d3d3d] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                        title="Zoom Out"
                        disabled={zoomLevel <= 1}
                    >
                        <ZoomOut size={14} className={zoomLevel <= 1 ? "opacity-50" : ""} />
                    </button>
                    <span className="text-[11px] font-mono text-zinc-400 w-8 text-center">{zoomLevel < 10 ? zoomLevel.toFixed(1) : Math.round(zoomLevel)}x</span>
                    <button
                        onClick={() => setZoomLevel(prev => Math.min(100, prev * 1.5))}
                        className="p-1 hover:bg-[#3d3d3d] text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                        title="Zoom In"
                        disabled={zoomLevel >= 100}
                    >
                        <ZoomIn size={14} className={zoomLevel >= 100 ? "opacity-50" : ""} />
                    </button>
                </div>
            </div>

            {/* Scrollable Timeline Area */}
            <div
                ref={containerRef}
                className={`flex-1 overflow-x-auto overflow-y-hidden relative group ${isEditMode ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                onMouseDown={(e) => {
                    if (isEditMode) {
                        e.preventDefault();
                        return;
                    }
                    // Pan on middle click, right click, or modifier + left click
                    if (e.button === 1 || e.button === 2 || e.altKey || e.shiftKey || e.ctrlKey) {
                        e.preventDefault();
                        isPanning.current = true;
                        if (containerRef.current) {
                            panStart.current = {
                                x: e.clientX,
                                scrollLeft: containerRef.current.scrollLeft
                            };
                        }
                        document.body.style.cursor = 'grabbing';
                    }
                }}
                onContextMenu={(e) => e.preventDefault()}
                onWheel={(e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        const zoomFactor = Math.pow(1.002, -e.deltaY);
                        setZoomLevel(prev => Math.max(1, Math.min(100, prev * zoomFactor)));
                    }
                }}
            >
                {/* Inner Track */}
                <div
                    className={`relative h-full transition-colors ${isEditMode ? 'bg-[#5a2e2e] opacity-80' : 'bg-[#2a2a2b] cursor-pointer group-hover:bg-[#2d2d2e]'}`}
                    style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
                    onMouseDown={(e) => {
                        if (isEditMode) {
                            e.preventDefault(); // Cannot seek in Edit Mode
                            return;
                        }
                        // Handle clicking to seek, or middle-click to pan
                        if (e.button === 1 || e.button === 2 || e.altKey || e.shiftKey || e.ctrlKey) {
                            return; // Let the outer container handle pan start
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        onSeek(percent * durationMs);
                    }}
                >
                    {/* Edit Mode Banner overlay */}
                    {isEditMode && (
                        <div className="absolute inset-x-0 inset-y-0 opacity-10 pointer-events-none flex items-center justify-center overflow-hidden" style={{ backgroundImage: 'linear-gradient(45deg, #ff4c4c 25%, transparent 25%, transparent 50%, #ff4c4c 50%, #ff4c4c 75%, transparent 75%, transparent)', backgroundSize: '40px 40px' }} />
                    )}

                    {/* Time Ticks Background (visual only) & Labels */}
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        {durationMs > 0 && (() => {
                            const totalSecs = durationMs / 1000;
                            const visibleSecs = totalSecs / zoomLevel;
                            const idealInterval = visibleSecs / 10;

                            let intervalSecs = 1;
                            if (idealInterval > 300) intervalSecs = 300;
                            else if (idealInterval > 60) intervalSecs = 60;
                            else if (idealInterval > 30) intervalSecs = 30;
                            else if (idealInterval > 10) intervalSecs = 10;
                            else if (idealInterval > 5) intervalSecs = 5;
                            else if (idealInterval > 2) intervalSecs = 2;
                            else if (idealInterval > 1) intervalSecs = 1;
                            else if (idealInterval > 0.5) intervalSecs = 0.5;
                            else if (idealInterval > 0.2) intervalSecs = 0.2;
                            else intervalSecs = 0.1;

                            const ticks = [];
                            for (let s = 0; s <= totalSecs; s += intervalSecs) {
                                const percent = (s / totalSecs) * 100;
                                const label = s % 1 === 0 ? s.toFixed(0) : (intervalSecs < 0.1 ? s.toFixed(2) : s.toFixed(1));
                                ticks.push(
                                    <div key={s} className="absolute top-0 bottom-0 border-l border-[#3d3d3d]/50" style={{ left: `${percent}%` }}>
                                        <span className="absolute left-1 top-0.5 text-[10px] text-zinc-500/80 font-mono select-none">
                                            {label}s
                                        </span>
                                    </div>
                                );
                            }
                            return ticks;
                        })()}
                    </div>
                    {/* Segments Layer */}
                    {segments.map((seg) => (
                        <div
                            key={seg.id}
                            className="absolute top-0 bottom-0 bg-[#007fd4]/20 border-l border-r border-[#007fd4]/50"
                            style={getWidthStyle(seg.start_ms, seg.end_ms)}
                        />
                    ))}

                    {/* Current Active Selection (IN to OUT) */}
                    {inMarker !== null && outMarker !== null && outMarker >= inMarker && (
                        <div
                            className="absolute top-0 bottom-0 bg-[#007fd4]/40 border-l border-r border-[#007fd4]"
                            style={getWidthStyle(inMarker, outMarker)}
                        />
                    )}
                    {inMarker !== null && outMarker === null && (
                        <div
                            className="absolute top-0 bottom-0 bg-[#007fd4]/10 border-l border-[#007fd4]"
                            style={getWidthStyle(inMarker, durationMs)}
                        />
                    )}

                    {/* IN Marker */}
                    {inMarker !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-px bg-[#007fd4] z-10 pointer-events-none"
                            style={getPositionStyle(inMarker)}
                        >
                            <div className="absolute top-0 -translate-x-1/2 bg-[#007fd4] text-white text-[9px] px-1 font-bold rounded-sm">IN</div>
                        </div>
                    )}

                    {/* OUT Marker */}
                    {outMarker !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
                            style={getPositionStyle(outMarker)}
                        >
                            <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 font-bold rounded-sm">OUT</div>
                        </div>
                    )}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 z-20 pointer-events-none mix-blend-difference"
                        style={getPositionStyle(currentTimeMs)}
                    >
                        {/* Line */}
                        <div className="absolute top-0 bottom-0 w-[2px] bg-zinc-200 -ml-[1px]" />
                        {/* Triangle */}
                        <div className="absolute top-0 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-zinc-200 -ml-[5px]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
