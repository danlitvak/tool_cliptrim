use std::sync::Mutex;
use tauri::State;
use std::path::PathBuf;
use crate::db::{self, Clip, Segment};
use crate::file_manager::WorkingDirectory;
use crate::ffmpeg::{self, VideoInfo};
use uuid::Uuid;
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

pub struct AppState {
    pub db: Mutex<Option<rusqlite::Connection>>,
    pub work_dir: Mutex<Option<WorkingDirectory>>,
}

#[tauri::command]
pub fn select_working_folder(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let wd = WorkingDirectory::new(&PathBuf::from(&path)).map_err(|e| e.to_string())?;
    
    // Init DB
    let conn = db::init_db(&wd.db_path).map_err(|e| e.to_string())?;
    
    *state.db.lock().unwrap() = Some(conn);
    *state.work_dir.lock().unwrap() = Some(wd);
    
    Ok(())
}

#[tauri::command]
pub fn scan_and_get_clips(state: State<'_, AppState>) -> Result<Vec<Clip>, String> {
    let wd_guard = state.work_dir.lock().unwrap();
    let wd = wd_guard.as_ref().ok_or("Working folder not set")?;
    
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    
    // Scan IN folder
    let in_files = wd.scan_in_folder().map_err(|e| e.to_string())?;
    
    for file in in_files {
        let name = file.file_name().unwrap().to_string_lossy().to_string();
        // Check if exists
        if let Ok(None) = db::get_clip_by_original_name(conn, &name) {
            let clip = Clip {
                id: Uuid::new_v4().to_string(),
                original_name: name.clone(),
                backup_path: file.to_string_lossy().to_string(), // Temporarily store IN path
                status: "new".to_string(),
                created_at: Utc::now().timestamp(),
            };
            db::insert_clip(conn, &clip).map_err(|e| e.to_string())?;
        }
    }
    
    // Return all clips
    db::get_clips(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_clip(clip_id: String, state: State<'_, AppState>) -> Result<Clip, String> {
    let wd_guard = state.work_dir.lock().unwrap();
    let wd = wd_guard.as_ref().ok_or("Working folder not set")?;
    
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    
    let clips = db::get_clips(conn).map_err(|e| e.to_string())?;
    let mut target_clip = clips.into_iter().find(|c| c.id == clip_id).ok_or("Clip not found")?;
    
    if target_clip.status == "new" {
        // Move to BACKUP
        let path = PathBuf::from(&target_clip.backup_path);
        if path.exists() {
            let new_path = wd.move_to_backup(&path).map_err(|e| e.to_string())?;
            
            // Update DB
            target_clip.backup_path = new_path.to_string_lossy().to_string();
            target_clip.status = "in_progress".to_string();
            
            conn.execute(
                "UPDATE clips SET backup_path = ?1, status = ?2 WHERE id = ?3",
                rusqlite::params![target_clip.backup_path, target_clip.status, target_clip.id],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(target_clip)
}

#[tauri::command]
pub fn get_segments(clip_id: String, state: State<'_, AppState>) -> Result<Vec<Segment>, String> {
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    db::get_segments(conn, &clip_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_segment(
    clip_id: String,
    start_ms: f64,
    end_ms: f64,
    state: State<'_, AppState>
) -> Result<Segment, String> {
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    
    let existing = db::get_segments(conn, &clip_id).unwrap_or_default();
    let idx = existing.len() as i64;
    
    let segment = Segment {
        id: Uuid::new_v4().to_string(),
        clip_id,
        idx,
        start_ms: start_ms.round() as i64,
        end_ms: end_ms.round() as i64,
        label: None,
    };
    
    db::insert_segment(conn, &segment).map_err(|e| e.to_string())?;
    eprintln!("[add_segment] clip_id={}, start_ms={}, end_ms={}, segment_id={}", segment.clip_id, start_ms, end_ms, segment.id);
    Ok(segment)
}

#[tauri::command]
pub fn delete_segment(segment_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    db::delete_segment(conn, &segment_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_segment_label(segment_id: String, label: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    conn.execute("UPDATE segments SET label = ?1 WHERE id = ?2", rusqlite::params![label, segment_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_segment_bounds(segment_id: String, start_ms: f64, end_ms: f64, state: State<'_, AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("DB not initialized")?;
    conn.execute("UPDATE segments SET start_ms = ?1, end_ms = ?2 WHERE id = ?3", rusqlite::params![start_ms.round() as i64, end_ms.round() as i64, segment_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_video_info(app_handle: tauri::AppHandle, path: String) -> Result<VideoInfo, String> {
    ffmpeg::get_video_info(&app_handle, &PathBuf::from(path)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn extract_frame(app_handle: tauri::AppHandle, path: String, time_ms: i64) -> Result<String, String> {
    let bytes = ffmpeg::extract_frame(&app_handle, &PathBuf::from(path), time_ms).await.map_err(|e| e.to_string())?;
    Ok(format!("data:image/jpeg;base64,{}", BASE64.encode(&bytes)))
}

#[derive(Clone, serde::Serialize)]
struct JobPayload {
    job_id: String,
    clip_id: String,
    clip_name: String,
    total_segments: usize,
}

#[derive(Clone, serde::Serialize)]
struct JobProgressPayload {
    job_id: String,
    current_segment: usize,
    total_segments: usize,
}

#[derive(Clone, serde::Serialize)]
struct JobCompletedPayload {
    job_id: String,
}

#[derive(Clone, serde::Serialize)]
struct JobFailedPayload {
    job_id: String,
    error: String,
}

#[tauri::command]
pub async fn export_segments(app_handle: tauri::AppHandle, clip_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let (wd, clip, segments) = {
        let wd_guard = state.work_dir.lock().unwrap();
        let wd = wd_guard.as_ref().ok_or("Working folder not set")?.clone();
        
        let db_guard = state.db.lock().unwrap();
        let conn = db_guard.as_ref().ok_or("DB not initialized")?;
        
        let clips = db::get_clips(conn).map_err(|e| e.to_string())?;
        let clip = clips.into_iter().find(|c| c.id == clip_id.clone()).ok_or("Clip not found")?;
        
        let segments = db::get_segments(conn, &clip_id).map_err(|e| e.to_string())?;
        eprintln!("[export] clip_id={}, backup_path={}, segment_count={}", clip_id, clip.backup_path, segments.len());
        (wd, clip, segments)
    };

    if segments.is_empty() {
        return Err("No segments to export. Add segments before exporting.".to_string());
    }
    
    // Generate a unique job ID for this export
    let job_id = uuid::Uuid::new_v4().to_string();
    let total_segments = segments.len();
    let clip_name = clip.original_name.clone();

    // Emit job started
    use tauri::Emitter;
    let _ = app_handle.emit("export-job-started", JobPayload {
        job_id: job_id.clone(),
        clip_id: clip_id.clone(),
        clip_name,
        total_segments,
    });

    // Spawn detached task for background export
    tauri::async_runtime::spawn(async move {
        let base_name = PathBuf::from(&clip.original_name)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
            
        for (i, seg) in segments.iter().enumerate() {
            let seg_num = i + 1;
            let mut out_name = format!("{}__trim{:02}", base_name, seg_num);
            if let Some(label) = &seg.label {
                if !label.trim().is_empty() {
                    out_name = format!("{}__{}", out_name, label);
                }
            }
            
            let mut target_out = wd.out_dir.join(format!("{}.mp4", out_name));
            let mut counter = 2;
            while target_out.exists() {
                target_out = wd.out_dir.join(format!("{}_v{}.mp4", out_name, counter));
                counter += 1;
            }
            
            // Wait for segment export to finish
            match ffmpeg::export_segment(
                &app_handle,
                &PathBuf::from(&clip.backup_path),
                &target_out,
                seg.start_ms,
                seg.end_ms
            ).await {
                Ok(_) => {
                    // Update progress
                    let _ = app_handle.emit("export-job-progress", JobProgressPayload {
                        job_id: job_id.clone(),
                        current_segment: seg_num,
                        total_segments,
                    });
                }
                Err(e) => {
                    // Emit error and abort this job
                    let _ = app_handle.emit("export-job-failed", JobFailedPayload {
                        job_id: job_id.clone(),
                        error: e.to_string(),
                    });
                    return;
                }
            }
        }
        
        // Finalize
        // Since we are in an async detached thread, we cannot easily access Tauri State. 
        // We'll just open a fresh DB connection to update status, as we have the DB path in WorkDir.
        let conn = rusqlite::Connection::open(&wd.db_path).ok();
        if let Some(c) = conn {
             let _ = db::update_clip_status(&c, &clip_id, "done");
        }

        let _ = app_handle.emit("export-job-completed", JobCompletedPayload { job_id });
    });
    
    Ok(())
}

#[tauri::command]
pub async fn test_ffmpeg(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_shell::ShellExt;
    
    let sidecar_command = app_handle
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create `ffmpeg` sidecar command: {}", e))?;
        
    let output = sidecar_command
        .args(["-version"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute `ffmpeg` sidecar: {}", e))?;
        
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!("FFmpeg failed with error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}
