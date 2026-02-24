interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300">
            <div className="flex flex-col items-center gap-3 px-6 py-4 bg-[#252526] border border-[#3d3d3d] rounded-lg shadow-2xl">
                <div className="w-6 h-6 border-[2px] border-[#3d3d3d] border-t-[#007fd4] rounded-full animate-spin"></div>
                {message && (
                    <div className="text-xs font-sans text-zinc-300 text-center max-w-xs">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
