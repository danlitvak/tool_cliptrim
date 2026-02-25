import React from 'react';
import { X, Settings2 } from 'lucide-react';

export interface Keybinds {
    playPause: string;
    setIn: string;
    setOut: string;
    addSegment: string;
    deleteSelected: string;
    export: string;
    nextClip: string;
    prevClip: string;
    scrubForward: string;
    scrubBackward: string;
    stepForward: string;
    stepBackward: string;
    speedUp: string;
    speedDown: string;
}

export interface AppSettings {
    scrubDuration: number;
    volume: number;
    isMuted: boolean;
    keybinds: Keybinds;
    lastUsedFolder?: string;
}

export const defaultSettings: AppSettings = {
    scrubDuration: 1.0,
    volume: 1.0,
    isMuted: false,
    keybinds: {
        playPause: ' ',
        setIn: 'i',
        setOut: 'o',
        addSegment: 'a',
        deleteSelected: 'delete',
        export: 'enter',
        nextClip: 'n',
        prevClip: 'p',
        scrubForward: 'arrowright',
        scrubBackward: 'arrowleft',
        stepForward: '.',
        stepBackward: ',',
        speedUp: 'arrowup',
        speedDown: 'arrowdown',
    }
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
    if (!isOpen) return null;

    const [editingKeyAction, setEditingKeyAction] = React.useState<keyof Keybinds | null>(null);
    const [activeTab, setActiveTab] = React.useState<'General' | 'Keyboard'>('General');

    React.useEffect(() => {
        if (!editingKeyAction) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            let key = e.key.toLowerCase();
            // Map common keys to more readable representations or stick to lower case
            if (key === ' ') key = ' ';

            // Only update if it's a valid key that isn't a standalone modifier
            if (!['shift', 'control', 'alt', 'meta'].includes(key)) {
                onSettingsChange({
                    ...settings,
                    keybinds: {
                        ...settings.keybinds,
                        [editingKeyAction]: key
                    }
                });
            }
            setEditingKeyAction(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [editingKeyAction, settings, onSettingsChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: any = value;

        if (type === 'number') {
            parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) parsedValue = 0;
        }

        onSettingsChange({
            ...settings,
            [name]: parsedValue
        });
    };

    const formatKey = (key: string) => {
        if (key === ' ') return 'Space';
        return key.charAt(0).toUpperCase() + key.slice(1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-none shadow-2xl w-full max-w-4xl flex flex-col h-[75vh] min-h-[500px] max-h-[800px] animate-in fade-in zoom-in duration-200">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 shrink-0 bg-[#252526] border-b border-[#2d2d2d]">
                    <div className="flex items-center gap-3 text-zinc-100">
                        <Settings2 className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-lg font-medium">Preferences</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#333333] rounded-none text-zinc-400 hover:text-white transition-colors"
                        title="Close Settings"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-56 shrink-0 flex flex-col border-r border-[#2d2d2d] bg-[#252526] py-3">
                        <button
                            onClick={() => setActiveTab('General')}
                            className={`w-full text-left px-6 py-2.5 text-sm transition-colors border-l-2 ${activeTab === 'General'
                                ? 'border-[#007fd4] bg-[#37373d] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2d2e]'
                                }`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('Keyboard')}
                            className={`w-full text-left px-6 py-2.5 text-sm transition-colors border-l-2 ${activeTab === 'Keyboard'
                                ? 'border-[#007fd4] bg-[#37373d] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2d2e]'
                                }`}
                        >
                            Keyboard Shortcuts
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative bg-[#1e1e1e]">
                        {/* Section Header */}
                        <div className="shrink-0 px-8 py-6 border-b border-[#2d2d2d] bg-[#1e1e1e] z-10">
                            <h3 className="text-xl font-medium text-zinc-100">
                                {activeTab === 'General' ? 'General Settings' : 'Keyboard Shortcuts'}
                            </h3>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
                            {activeTab === 'General' && (
                                <div className="max-w-xl space-y-8">
                                    {/* Setting Item */}
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-zinc-200 text-sm font-medium">Keyboard Scrubbing Duration</h4>
                                        <span className="text-xs text-zinc-500 mb-2">
                                            The amount of time (in seconds) the video will skip when using the Left or Right arrow keys.
                                        </span>
                                        <input
                                            type="number"
                                            name="scrubDuration"
                                            value={settings.scrubDuration}
                                            onChange={handleChange}
                                            step="0.5"
                                            min="0.5"
                                            max="10"
                                            className="w-32 bg-[#3c3c3c] border border-transparent hover:bg-[#464646] rounded-none px-3 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-[#007fd4] transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Keyboard' && (
                                <div className="max-w-3xl space-y-2">
                                    <div className="flex flex-col font-sans">
                                        {(Object.entries({
                                            'playPause': 'Play / Pause',
                                            'setIn': 'Set IN Marker',
                                            'setOut': 'Set OUT Marker',
                                            'addSegment': 'Add Segment',
                                            'deleteSelected': 'Delete Selected Segment',
                                            'export': 'Export Segments',
                                            'nextClip': 'Next Clip',
                                            'prevClip': 'Previous Clip',
                                            'scrubForward': 'Scrub Forward',
                                            'scrubBackward': 'Scrub Backward',
                                            'stepForward': 'Step Frame Forward',
                                            'stepBackward': 'Step Frame Backward',
                                            'speedUp': 'Increase Speed',
                                            'speedDown': 'Decrease Speed',
                                        }) as [keyof Keybinds, string][]).map(([action, label]) => (
                                            <div key={action} className="flex items-center justify-between border-b border-[#2d2d2d]/50 py-3 hover:bg-[#2a2d2e]/30 px-3 -mx-3 transition-colors group">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-zinc-200">{label}</span>
                                                    <span className="text-[11px] text-zinc-500 font-mono mt-1">clipTrim.action.{action.toLowerCase()}</span>
                                                </div>
                                                <button
                                                    onClick={() => setEditingKeyAction(action as keyof Keybinds)}
                                                    className={`px-4 py-1.5 rounded-none text-xs font-mono min-w-[120px] text-center border transition-colors ${editingKeyAction === action
                                                        ? 'bg-[#007fd4]/20 border-[#007fd4] text-[#007fd4] animate-pulse'
                                                        : 'bg-[#3c3c3c] border-transparent text-zinc-200 group-hover:bg-[#464646] hover:!border-[#007fd4]'
                                                        }`}
                                                >
                                                    {editingKeyAction === action ? 'Press key...' : formatKey(settings.keybinds[action as keyof Keybinds])}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Component */}
                <div className="flex items-center justify-end px-6 py-4 shrink-0 bg-[#252526] border-t border-[#2d2d2d]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm font-medium rounded-none transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
