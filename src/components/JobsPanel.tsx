import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export interface JobPayload {
    job_id: string;
    clip_id: string;
    clip_name: string;
    total_segments: number;
}

export interface JobProgressPayload {
    job_id: string;
    current_segment: number;
    total_segments: number;
}

export interface JobCompletedPayload {
    job_id: string;
}

export interface JobFailedPayload {
    job_id: string;
    error: string;
}

export interface ExportJob {
    id: string;
    clipName: string;
    totalSegments: number;
    currentSegment: number;
    status: 'running' | 'completed' | 'failed';
    error?: string;
}

export function JobsPanel() {
    const [jobs, setJobs] = useState<ExportJob[]>([]);

    useEffect(() => {
        let cancelled = false;
        // Track all unlisten functions so we can tear them all down in the cleanup
        const unlisteners: Array<() => void> = [];

        const setupListeners = async () => {
            const unlistenStarted = await listen<JobPayload>('export-job-started', (event) => {
                setJobs((prev) => [
                    ...prev,
                    {
                        id: event.payload.job_id,
                        clipName: event.payload.clip_name,
                        totalSegments: event.payload.total_segments,
                        currentSegment: 0,
                        status: 'running',
                    },
                ]);
            });

            const unlistenProgress = await listen<JobProgressPayload>('export-job-progress', (event) => {
                setJobs((prev) =>
                    prev.map((job) =>
                        job.id === event.payload.job_id
                            ? { ...job, currentSegment: event.payload.current_segment }
                            : job
                    )
                );
            });

            const unlistenCompleted = await listen<JobCompletedPayload>('export-job-completed', (event) => {
                setJobs((prev) =>
                    prev.map((job) =>
                        job.id === event.payload.job_id
                            ? { ...job, status: 'completed', currentSegment: job.totalSegments }
                            : job
                    )
                );

                // Automatically remove completed jobs after 5 seconds
                setTimeout(() => {
                    setJobs((currentJobs) => currentJobs.filter((j) => j.id !== event.payload.job_id));
                }, 5000);
            });

            const unlistenFailed = await listen<JobFailedPayload>('export-job-failed', (event) => {
                setJobs((prev) =>
                    prev.map((job) =>
                        job.id === event.payload.job_id
                            ? { ...job, status: 'failed', error: event.payload.error }
                            : job
                    )
                );
            });

            if (cancelled) {
                // Cleanup ran before the async setup finished — unregister immediately
                unlistenStarted();
                unlistenProgress();
                unlistenCompleted();
                unlistenFailed();
                return;
            }

            unlisteners.push(unlistenStarted, unlistenProgress, unlistenCompleted, unlistenFailed);
        };

        setupListeners();

        return () => {
            cancelled = true;
            unlisteners.forEach((fn) => fn());
        };
    }, []);

    return (
        <div className="flex flex-col w-full border-b border-[#2d2d2d]">
            {/* Header always visible */}
            <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${jobs.length > 0
                ? 'bg-[#1e1e1e] text-zinc-300 border-b border-[#2d2d2d]'
                : 'bg-[#2d2d2d] text-zinc-500'
                }`}>
                <span>Export Jobs</span>
                {jobs.length > 0 && (
                    <span className="bg-[#2d2d2d] text-zinc-400 text-[10px] py-0.5 px-2 rounded normal-case tracking-normal">
                        {jobs.length}
                    </span>
                )}
            </div>

            {jobs.length === 0 ? (
                <p className="text-xs text-zinc-600 italic px-3 py-2">No active export jobs.</p>
            ) : (
                <div className="flex flex-col p-2 gap-2 max-h-48 overflow-y-auto">
                    {jobs.map((job) => (
                        <div key={job.id} className="bg-[#1e1e1e] p-3 rounded text-sm border border-[#3c3c3c]">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold truncate mr-2 text-zinc-200" title={job.clipName}>
                                    {job.clipName}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${job.status === 'running' ? 'bg-blue-900/60 text-blue-400' :
                                    job.status === 'completed' ? 'bg-green-900/60 text-green-400' :
                                        'bg-red-900/60 text-red-400'
                                    }`}>
                                    {job.status === 'running' ? 'EXPORTING' : job.status.toUpperCase()}
                                </span>
                            </div>

                            {job.status === 'running' && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                        <span>Segment {job.currentSegment} / {job.totalSegments}</span>
                                        <span>{Math.round((job.currentSegment / job.totalSegments) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-[#3c3c3c] rounded-full h-1.5">
                                        <div
                                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(job.currentSegment / job.totalSegments) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {job.status === 'failed' && (
                                <div className="mt-1 text-xs text-red-400 truncate" title={job.error}>
                                    {job.error}
                                </div>
                            )}

                            {job.status === 'completed' && (
                                <div className="mt-1 text-xs text-green-400">
                                    Exported {job.totalSegments} segment{job.totalSegments !== 1 ? 's' : ''} ✓
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
