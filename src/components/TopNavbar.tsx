interface TopNavbarProps {
    onToggleDebug: () => void;
    onOpenSettings: () => void;
    onOpenAbout: () => void;
    isDebugOpen: boolean;
}

export function TopNavbar({ onToggleDebug, onOpenSettings, onOpenAbout, isDebugOpen }: TopNavbarProps) {
    return (
        <div className="h-9 w-full bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between px-3 select-none flex-shrink-0 z-50">
            {/* Left side: Logo & Menus */}
            <div className="flex items-center gap-4 h-full flex-1">
                <span className="text-[11px] font-sans text-zinc-300 tracking-wider font-semibold pl-1">ClipTrim</span>

                <div className="flex items-center h-full">
                    {/* Console Toggle */}
                    <button
                        onClick={onToggleDebug}
                        className={`px-3 h-full text-[11px] transition-colors flex items-center ${isDebugOpen
                            ? 'bg-[#37373d] text-zinc-100'
                            : 'hover:bg-[#2d2d2d] text-zinc-400'
                            }`}
                        title="Toggle Debug Console"
                    >
                        <span>Console</span>
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="px-3 h-full text-[11px] transition-colors hover:bg-[#2d2d2d] text-zinc-400 flex items-center"
                        title="Open Settings"
                    >
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={onOpenAbout}
                        className="px-3 h-full text-[11px] transition-colors hover:bg-[#2d2d2d] text-zinc-400 flex items-center"
                        title="About ClipTrim"
                    >
                        <span>About</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
