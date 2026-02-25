import { X, Info } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-none shadow-2xl w-full max-w-3xl flex flex-col h-[75vh] min-h-[500px] max-h-[800px] animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 shrink-0 bg-[#252526] border-b border-[#2d2d2d]">
                    <div className="flex items-center gap-3 text-zinc-100">
                        <Info className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-lg font-medium">About ClipTrim</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#333333] rounded-none text-zinc-400 hover:text-white transition-colors"
                        title="Close About"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 text-zinc-300 space-y-6">
                    <section className="space-y-4">
                        <p>
                            ClipTrim is a precision video trimming tool built for creators who generate high-quality replay clips and want to quickly extract only the moments that matter.
                        </p>
                        <p>
                            Modern clipping software often records fixed-length clips (e.g., 2 minutes), even when the highlight lasts only a few seconds. Over time, this results in wasted storage, bloated folders, and unnecessary file management.
                        </p>
                        <p>
                            ClipTrim solves this by providing a fast, keyboard-driven workflow for creating frame-accurate trims from your clips — helping you reduce storage usage while preserving quality.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-medium text-zinc-100 pb-2 border-b border-[#2d2d2d]">Intended Use</h3>
                        <p>ClipTrim is designed for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Gamers using replay buffer software (OBS, ShadowPlay, etc.)</li>
                            <li>Content creators trimming highlight moments</li>
                            <li>Anyone generating fixed-length MP4 clips who wants to remove unused footage</li>
                            <li>Users who want precise, deterministic trimming with full control over exported segments</li>
                        </ul>
                        <p>
                            It is optimized for processing folders of MP4 clips in a clean, structured workflow.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-medium text-zinc-100 pb-2 border-b border-[#2d2d2d]">Purpose</h3>
                        <p>The purpose of ClipTrim is to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Eliminate wasted storage from oversized clips</li>
                            <li>Provide frame-accurate trimming</li>
                            <li>Enable multiple highlights per clip</li>
                            <li>Maintain a safe backup workflow</li>
                            <li>Offer a keyboard-first, efficient editing experience</li>
                        </ul>
                        <p>Rather than functioning as a full video editor, ClipTrim focuses on one thing:</p>
                        <p className="font-semibold text-zinc-100">
                            Extracting meaningful segments quickly and precisely.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-medium text-zinc-100 pb-2 border-b border-[#2d2d2d]">Core Workflow Philosophy</h3>
                        <p>ClipTrim is built around a clean folder structure:</p>
                        <ul className="space-y-2">
                            <li><strong className="text-zinc-100">IN/</strong> &mdash; Incoming clips</li>
                            <li><strong className="text-zinc-100">OUT/</strong> &mdash; Trimmed segments</li>
                            <li><strong className="text-zinc-100">BACKUP/</strong> &mdash; Safely stored originals</li>
                        </ul>
                        <p>
                            When a clip is opened, it is moved to BACKUP so your IN folder stays clean and ready for new recordings.
                        </p>
                        <p>
                            Each clip can produce multiple trimmed segments, each exported as a separate file.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-medium text-zinc-100 pb-2 border-b border-[#2d2d2d]">Best Practices for Using ClipTrim</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-zinc-100">1. Process Clips in Batches</h4>
                                <p className="mt-1">Let your replay software save clips into IN/, then process them in batches using ClipTrim to keep your workflow organized.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-100">2. Use Keyboard Shortcuts</h4>
                                <p className="mt-1">For maximum speed:</p>
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li><strong className="text-zinc-100">Space</strong> &mdash; Play/Pause</li>
                                    <li><strong className="text-zinc-100">I</strong> &mdash; Set IN</li>
                                    <li><strong className="text-zinc-100">O</strong> &mdash; Set OUT</li>
                                    <li><strong className="text-zinc-100">A</strong> &mdash; Add segment</li>
                                    <li><strong className="text-zinc-100">Enter</strong> &mdash; Export</li>
                                </ul>
                                <p className="mt-2 text-sm italic text-zinc-400">ClipTrim is optimized for minimal mouse usage.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-100">3. Trim Aggressively</h4>
                                <p className="mt-1">Don't just cut the obvious beginning and end &mdash; remove all dead time. This is where storage savings compound over time.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-100">4. Periodically Review BACKUP</h4>
                                <p className="mt-1">Original clips are moved to BACKUP for safety. Once you confirm your trims are correct, you can delete backups manually.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-100">5. Keep It Focused</h4>
                                <p className="mt-1">ClipTrim is not meant to replace a full editor. Use it to isolate highlights, then move those segments into your editing software if needed.</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xl font-medium text-zinc-100 pb-2 border-b border-[#2d2d2d]">Design Principles</h3>
                        <p>ClipTrim is built around:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Deterministic file behavior</li>
                            <li>Frame accuracy</li>
                            <li>Local-only processing</li>
                            <li>No telemetry</li>
                            <li>No cloud dependencies</li>
                            <li>Predictable folder management</li>
                        </ul>
                        <p className="font-semibold text-zinc-100 pt-2">
                            It is a tool for precision and efficiency.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 shrink-0 bg-[#252526] border-t border-[#2d2d2d]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm font-medium rounded-none transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
