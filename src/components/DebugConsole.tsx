import { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2 } from 'lucide-react';

interface LogEntry {
    id: number;
    time: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
}

// Global log storage so they persist when console is closed/opened
export const globalLogs: LogEntry[] = [];
let nextLogId = 1;
type LogListener = () => void;
const listeners: LogListener[] = [];

export function addLog(level: LogEntry['level'], message: string) {
    const time = new Date().toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    } as unknown as Intl.DateTimeFormatOptions);
    globalLogs.push({ id: nextLogId++, time, level, message });
    // Keep only last 500 logs
    if (globalLogs.length > 500) globalLogs.shift();
    listeners.forEach(l => l());
}

// Intercept unhandled errors
window.addEventListener('error', (e) => {
    addLog('error', `[Window]: ${e.message} at ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e) => {
    addLog('error', `[Promise]: ${e.reason}`);
});

interface DebugConsoleProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DebugConsole({ isOpen, onClose }: DebugConsoleProps) {
    const [logs, setLogs] = useState<LogEntry[]>([...globalLogs]);
    const endRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(250);
    const isDragging = useRef(false);

    useEffect(() => {
        const listener = () => setLogs([...globalLogs]);
        listeners.push(listener);
        return () => {
            const idx = listeners.indexOf(listener);
            if (idx > -1) listeners.splice(idx, 1);
        };
    }, []);

    useEffect(() => {
        if (endRef.current && isOpen) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newHeight = window.innerHeight - e.clientY;
            setHeight(Math.max(100, Math.min(newHeight, window.innerHeight * 0.8)));
        };
        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{ height: `${height}px` }} className="w-full bg-[#1e1e1e] border-t border-[#3d3d3d] z-50 flex flex-col font-mono text-xs flex-shrink-0 relative">
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/50 transition-colors z-10"
                onMouseDown={(e) => {
                    isDragging.current = true;
                    document.body.style.cursor = 'ns-resize';
                    e.preventDefault();
                }}
            />
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#252526] border-b border-[#3d3d3d] text-zinc-300">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-[#007fd4]" />
                    <span className="font-semibold tracking-wide uppercase">Debug Console</span>
                    <span className="ml-2 px-2 py-0.5 bg-[#1e1e1e] rounded-full text-[10px]">{logs.length}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { globalLogs.length = 0; setLogs([]); }}
                        className="hover:text-red-400 transition-colors flex items-center gap-1"
                        title="Clear Console"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                    <button onClick={onClose} className="hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="text-zinc-600 text-center py-4 italic">No logs yet...</div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex hover:bg-[#2d2d2d] px-2 py-0.5 rounded transition-colors break-words">
                            <span className="text-zinc-500 mr-3 shrink-0 select-none">[{log.time}]</span>
                            <span className={`flex-1 ${log.level === 'error' ? 'text-red-400' :
                                log.level === 'warn' ? 'text-amber-400' :
                                    log.level === 'success' ? 'text-emerald-400' :
                                        'text-zinc-300'
                                }`}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}
