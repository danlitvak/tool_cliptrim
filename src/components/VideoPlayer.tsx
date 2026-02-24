import React, { useEffect, useRef } from 'react';
import { addLog } from './DebugConsole';

interface VideoPlayerProps {
    videoUrl: string | null;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onTimeUpdate: (timeMs: number) => void;
    onLoadedMetadata: (durationMs: number) => void;
    onSetIn: () => void;
    onSetOut: () => void;
    onAddSegment: () => void;
    onDeleteSelected: () => void;
    onExport: () => void;
    onNextClip: () => void;
    onPrevClip: () => void;
    fps: number;
    scrubDuration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    setPlaybackRate: React.Dispatch<React.SetStateAction<number>>;
    keybinds: {
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
    };
}

export function VideoPlayer({
    videoUrl,
    videoRef,
    onTimeUpdate,
    onLoadedMetadata,
    onSetIn,
    onSetOut,
    onAddSegment,
    onDeleteSelected,
    onExport,
    onNextClip,
    onPrevClip,
    fps,
    scrubDuration,
    volume,
    isMuted,
    playbackRate,
    setPlaybackRate,
    keybinds
}: VideoPlayerProps) {

    // Apply volume changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted, videoRef, videoUrl]);

    // Apply playback rate changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, videoRef, videoUrl]);

    // Sync callbacks into a mutable ref to avoid tearing down the window event listener
    // on every render cycle (which causes dropped keystrokes)
    const callbacksRef = useRef({
        onSetIn,
        onSetOut,
        onAddSegment,
        onDeleteSelected,
        onExport,
        onNextClip,
        onPrevClip,
        fps,
        scrubDuration,
        keybinds,
    });

    useEffect(() => {
        callbacksRef.current = {
            onSetIn,
            onSetOut,
            onAddSegment,
            onDeleteSelected,
            onExport,
            onNextClip,
            onPrevClip,
            fps,
            scrubDuration,
            keybinds,
        };
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (!videoRef.current) return;
            const video = videoRef.current;
            const kb = callbacksRef.current.keybinds;

            switch (e.key.toLowerCase()) {
                case kb.playPause:
                    e.preventDefault();
                    if (video.paused) video.play();
                    else video.pause();
                    break;
                case kb.setIn:
                    e.preventDefault();
                    callbacksRef.current.onSetIn();
                    break;
                case kb.setOut:
                    e.preventDefault();
                    callbacksRef.current.onSetOut();
                    break;
                case kb.addSegment:
                    e.preventDefault();
                    callbacksRef.current.onAddSegment();
                    break;
                case kb.deleteSelected:
                    e.preventDefault();
                    callbacksRef.current.onDeleteSelected();
                    break;
                case kb.export:
                    e.preventDefault();
                    callbacksRef.current.onExport();
                    break;
                case kb.nextClip:
                    e.preventDefault();
                    callbacksRef.current.onNextClip();
                    break;
                case kb.prevClip:
                    e.preventDefault();
                    callbacksRef.current.onPrevClip();
                    break;
                case kb.scrubForward:
                    e.preventDefault();
                    if (Number.isFinite(video.duration)) {
                        video.currentTime = Math.min(video.duration, video.currentTime + callbacksRef.current.scrubDuration);
                    }
                    break;
                case kb.scrubBackward:
                    e.preventDefault();
                    if (Number.isFinite(video.duration)) {
                        video.currentTime = Math.max(0, video.currentTime - callbacksRef.current.scrubDuration);
                    }
                    break;
                case kb.speedUp:
                    e.preventDefault();
                    setPlaybackRate(prev => Math.min(4.0, prev + 0.25));
                    addLog('info', `Playback speed increased to ${Math.min(4.0, playbackRate + 0.25)}x`);
                    break;
                case kb.speedDown:
                    e.preventDefault();
                    setPlaybackRate(prev => Math.max(0.25, prev - 0.25));
                    addLog('info', `Playback speed decreased to ${Math.max(0.25, playbackRate - 0.25)}x`);
                    break;
                case kb.stepBackward:
                    e.preventDefault();
                    if (!Number.isFinite(video.duration)) {
                        addLog('warn', 'Video duration is not available yet.');
                        return;
                    }
                    video.pause();
                    video.currentTime = Math.max(0, video.currentTime - (1 / (callbacksRef.current.fps || 30)));
                    break;
                case kb.stepForward:
                    e.preventDefault();
                    if (!Number.isFinite(video.duration)) {
                        addLog('warn', 'Video duration is not available yet.');
                        return;
                    }
                    video.pause();
                    video.currentTime = Math.min(video.duration, video.currentTime + (1 / (callbacksRef.current.fps || 30)));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [videoRef]); // We only re-bind if the videoRef changes, capturing callbacks via ref

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-black relative overflow-hidden border-b border-[#2d2d2d]">
            {videoUrl ? (
                <video
                    key={videoUrl}
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        const target = e.currentTarget;
                        const error = target.error;
                        addLog('error', `Video failed to load: ${videoUrl}`);
                        if (error) {
                            addLog('error', `MediaError code: ${error.code}, message: ${error.message}`);
                        }
                    }}
                    onClick={(e) => {
                        const video = e.currentTarget;
                        if (video.paused) {
                            video.play();
                        } else {
                            video.pause();
                        }
                    }}
                    onTimeUpdate={(e) => {
                        const timeMs = Math.floor(e.currentTarget.currentTime * 1000);
                        onTimeUpdate(timeMs);
                    }}
                    onLoadedMetadata={(e) => {
                        addLog('success', `Video metadata loaded! Duration: ${e.currentTarget.duration}s`);
                        const durationMs = Math.floor(e.currentTarget.duration * 1000);
                        onLoadedMetadata(durationMs);
                    }}
                    controls={false}
                    autoPlay={true}
                    preload="auto"
                >
                    <source src={videoUrl} type="video/mp4" />
                </video>
            ) : (
                <div className="text-zinc-500 flex flex-col items-center">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p>Select a clip to start trimming</p>
                </div>
            )}
        </div>
    );
}
