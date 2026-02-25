import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "./components/Sidebar";
import { SegmentList } from "./components/SegmentList";
import { VideoPlayer } from "./components/VideoPlayer";
import { Timeline } from "./components/Timeline";
import { TopNavbar } from "./components/TopNavbar";
import { DebugConsole, addLog } from "./components/DebugConsole";
import { SettingsModal, AppSettings, defaultSettings } from "./components/SettingsModal";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { JobsPanel } from "./components/JobsPanel";
import { Clip, Segment, VideoInfo } from "./types";

export function App() {
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [workingFolder, setWorkingFolder] = useState<string | null>(null);

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [inMarker, setInMarker] = useState<number | null>(null);
  const [outMarker, setOutMarker] = useState<number | null>(null);
  const [fps, setFps] = useState(30);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('clipTrimSettings');
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved);
    return {
      ...defaultSettings,
      ...parsed,
      keybinds: { ...defaultSettings.keybinds, ...(parsed.keybinds || {}) },
    };
  });

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setSettingsChanged(true);
    localStorage.setItem('clipTrimSettings', JSON.stringify(newSettings));
  };

  // Initialize
  useEffect(() => {
    // Attempt to auto-load the last used folder
    const initFolder = async () => {
      if (settings.lastUsedFolder) {
        try {
          await invoke("select_working_folder", { path: settings.lastUsedFolder });
          setWorkingFolder(settings.lastUsedFolder);
        } catch (e) {
          console.warn("Failed to load last used folder:", e);
        }
      }
    };
    initFolder();
  }, []);

  useEffect(() => {
    if (workingFolder) {
      scanClips();
    }
  }, [workingFolder]);

  useEffect(() => {
    if (activeClipId) {
      loadClip(activeClipId);
    }
  }, [activeClipId]);

  const scanClips = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Scanning for clips...");
      const dbClips = await invoke<Clip[]>("scan_and_get_clips");
      setClips(dbClips);
    } catch (e) {
      console.error("Failed to scan clips", e);
      addToast("Failed to scan clips: " + e, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClip = async (id: string) => {
    try {
      setIsLoading(true);
      setLoadingMessage("Loading clip...");
      const clip = await invoke<Clip>("open_clip", { clipId: id });
      setActiveClip(clip);

      const segs = await invoke<Segment[]>("get_segments", { clipId: id });
      setSegments(segs);

      // Reset markers
      setInMarker(null);
      setOutMarker(null);
      setCurrentTimeMs(0);

      // Get Info
      try {
        const info = await invoke<VideoInfo>("get_video_info", { path: clip.backup_path });
        setFps(info.fps);
      } catch (e) {
        console.warn("Failed to get VideoInfo via ffprobe", e);
      }

      // Refresh clips to update status if it changed
      await scanClips();
    } catch (e) {
      console.error("Failed to load clip", e);
      addToast("Failed to load clip: " + e, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Working Folder for ClipTrim",
      });

      if (selected && typeof selected === 'string') {
        try {
          await invoke("select_working_folder", { path: selected });
          setWorkingFolder(selected);
          handleSettingsChange({ ...settings, lastUsedFolder: selected });
          addToast(`Working folder set to ${selected}`, 'success');
        } catch (e) {
          addToast("Failed to set working folder: " + e, 'error');
        }
      }
    } catch (err) {
      console.error("Dialog error or user cancelled:", err);
    }
  };

  const activeVideoUrl = activeClip
    ? `http://localhost:50123/video?path=${encodeURIComponent(activeClip.backup_path)}`
    : null;

  const handleVolumeChange = (volume: number) => {
    handleSettingsChange({ ...settings, volume });
  };

  const handleMuteChange = (isMuted: boolean) => {
    handleSettingsChange({ ...settings, isMuted });
  };

  // Shortcuts
  const handleSetIn = () => setInMarker(currentTimeMs);
  const handleSetOut = () => setOutMarker(currentTimeMs);

  const handleAddSegment = async () => {
    console.log(`handleAddSegment called | in: ${inMarker}, out: ${outMarker}, clipId: ${activeClipId}`);
    if (inMarker === null || outMarker === null) {
      addToast("Please set both an IN (I) and OUT (O) marker before adding a segment.", 'error');
      return;
    }
    if (outMarker <= inMarker) {
      addToast("OUT marker must be after IN marker.", 'error');
      return;
    }
    if (!activeClipId) {
      addToast("No active clip selected.", 'error');
      return;
    }

    try {
      const newSeg = await invoke<Segment>("add_segment", {
        clipId: activeClipId,
        startMs: inMarker,
        endMs: outMarker
      });
      console.log("Segment added successfully:", newSeg);
      setSegments([...segments, newSeg]);
      setInMarker(null);
      setOutMarker(null);
      addLog('success', `Added segment from ${inMarker}ms to ${outMarker}ms`);
    } catch (e: any) {
      console.error(e);
      addToast("Failed to add segment: " + e.toString(), 'error');
      addLog('error', `Failed to add segment: ${e.toString()}`);
    }
  };

  const handleDeleteSelected = () => {
    // In a full app, we might track 'selectedSegmentId'
    // For now, let's delete the last added segment or the newest one
    if (segments.length === 0) return;
    const lastSeg = segments[segments.length - 1];
    handleDeleteSegment(lastSeg.id);
  };

  const handleDeleteSegment = async (id: string) => {
    try {
      await invoke("delete_segment", { segmentId: id });
      setSegments(segments.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLabel = async (id: string, label: string) => {
    try {
      await invoke("update_segment_label", { segmentId: id, label });
      setSegments(segments.map(s => s.id === id ? { ...s, label } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeek = (timeMs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeMs / 1000;
    }
  };

  const handleExport = async () => {
    if (!activeClipId) return;
    if (segments.length === 0) {
      addToast("No segments to export. Set IN/OUT markers and add segments first.", 'error');
      return;
    }

    // We do NOT set isLoading(true) here because exporting is now in the background.
    addToast(`Export job started for ${activeClip?.original_name}`, 'success');

    try {
      await invoke("export_segments", { clipId: activeClipId });
      // The background rust task is running and emitting events now.

      // We can auto-advance smoothly without waiting for it.
      await scanClips();
      handleNextClip();
    } catch (e) {
      addToast("Failed to start export task: " + e, 'error');
      console.error(e);
    }
  };

  const handleNextClip = () => {
    if (!activeClipId || clips.length === 0) return;
    const idx = clips.findIndex(c => c.id === activeClipId);
    if (idx < clips.length - 1) {
      setActiveClipId(clips[idx + 1].id);
    }
  };

  const handlePrevClip = () => {
    if (!activeClipId || clips.length === 0) return;
    const idx = clips.findIndex(c => c.id === activeClipId);
    if (idx > 0) {
      setActiveClipId(clips[idx - 1].id);
    }
  };

  const [isDebugOpen, setIsDebugOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#1e1e1e] text-zinc-300 overflow-hidden flex flex-col font-sans relative">
      <TopNavbar
        onToggleDebug={() => setIsDebugOpen(!isDebugOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDebugOpen={isDebugOpen}
      />
      <div className="flex-1 w-full h-full overflow-hidden relative border-t border-zinc-800">
        <PanelGroup id="cliptrim-main-layout" orientation="horizontal" className="h-full w-full">
          {/* Left Sidebar Panel */}
          <Panel id="sidebar" defaultSize="25%" minSize="15%" maxSize="40%" className="flex flex-col min-w-0 bg-[#252526]">
            <Sidebar
              clips={clips}
              activeClipId={activeClipId}
              onSelectClip={setActiveClipId}
              onSelectFolder={handleSelectFolder}
              workingFolder={workingFolder}
            />
          </Panel>

          <PanelResizeHandle className="w-[2px] bg-[#2d2d2d] hover:bg-[#007fd4] active:bg-[#007fd4] transition-colors cursor-col-resize z-10" />

          {/* Center Main Panel */}
          <Panel id="main-video" className="flex flex-col min-w-0 bg-[#1e1e1e]">
            <PanelGroup id="center-panels" orientation="vertical" className="w-[100%] h-full">
              <Panel id="video-preview" defaultSize="75%" minSize="30%" className="flex flex-col relative overflow-hidden min-w-0">
                <VideoPlayer
                  videoUrl={activeVideoUrl}
                  videoRef={videoRef}
                  onTimeUpdate={setCurrentTimeMs}
                  onLoadedMetadata={setDurationMs}
                  onSetIn={handleSetIn}
                  onSetOut={handleSetOut}
                  onAddSegment={handleAddSegment}
                  onDeleteSelected={handleDeleteSelected}
                  onExport={handleExport}
                  onNextClip={handleNextClip}
                  onPrevClip={handlePrevClip}
                  fps={fps}
                  scrubDuration={settings.scrubDuration}
                  volume={settings.volume}
                  isMuted={settings.isMuted}
                  playbackRate={playbackRate}
                  setPlaybackRate={setPlaybackRate}
                  keybinds={settings.keybinds}
                />
              </Panel>

              {activeClip && (
                <>
                  <PanelResizeHandle className="h-[2px] bg-[#2d2d2d] hover:bg-[#007fd4] active:bg-[#007fd4] transition-colors cursor-row-resize z-10 w-full" />
                  <Panel id="timeline-dock" defaultSize="25%" minSize="10%" maxSize="50%" className="flex flex-col relative overflow-hidden min-w-0">
                    <Timeline
                      durationMs={durationMs}
                      currentTimeMs={currentTimeMs}
                      inMarker={inMarker}
                      outMarker={outMarker}
                      segments={segments}
                      onSeek={(timeMs) => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = timeMs / 1000;
                        }
                      }}
                      volume={settings.volume}
                      isMuted={settings.isMuted}
                      playbackRate={playbackRate}
                      onVolumeChange={handleVolumeChange}
                      onMuteChange={handleMuteChange}
                    />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* Right Sidebar Panel */}
          {activeClip && (
            <PanelResizeHandle className="w-[2px] bg-[#2d2d2d] hover:bg-[#007fd4] active:bg-[#007fd4] transition-colors cursor-col-resize z-10" />
          )}
          {activeClip && (
            <Panel id="segments-sidebar" defaultSize="25%" minSize="15%" maxSize="40%" className="flex flex-col min-w-0 overflow-hidden bg-[#252526]">
              {/* Jobs Panel - always visible */}
              <JobsPanel />
              {/* Segments - takes all remaining space; SegmentList handles its own scroll */}
              <div className="flex-1 min-h-0">
                <SegmentList
                  segments={segments}
                  onDelete={handleDeleteSegment}
                  onUpdateLabel={handleUpdateLabel}
                  onUpdateBounds={() => { }}
                  onSeek={handleSeek}
                />
              </div>
            </Panel>
          )}
        </PanelGroup>
      </div>

      <DebugConsole
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (settingsChanged) {
            addToast("Preferences saved", "success");
            setSettingsChanged(false);
          }
        }}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </div>
  );
}

export default App;
