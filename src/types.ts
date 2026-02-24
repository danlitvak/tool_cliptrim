export interface Clip {
    id: string;
    original_name: string;
    backup_path: string;
    status: string;
    created_at: number;
}

export interface Segment {
    id: string;
    clip_id: string;
    idx: number;
    start_ms: number;
    end_ms: number;
    label?: string;
}

export interface VideoInfo {
    duration_sec: number;
    fps: number;
}
