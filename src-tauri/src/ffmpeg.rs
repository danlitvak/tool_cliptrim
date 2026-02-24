use serde::Deserialize;
use serde::Serialize;
use std::io::Result;
use std::path::Path;
use tauri_plugin_shell::ShellExt;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
pub struct FfprobeFormat {
    pub duration: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FfprobeStream {
    pub r_frame_rate: String,
}

#[derive(Debug, Deserialize)]
pub struct FfprobeOutput {
    pub format: FfprobeFormat,
    pub streams: Vec<FfprobeStream>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub duration_sec: f64,
    pub fps: f64,
}

pub async fn get_video_info(app_handle: &AppHandle, file_path: &Path) -> Result<VideoInfo> {
    let sidecar_command = app_handle
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    let output = sidecar_command
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=r_frame_rate:format=duration",
            "-of",
            "json",
            file_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    if !output.status.success() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "ffprobe failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ),
        ));
    }

    let parsed: FfprobeOutput = serde_json::from_slice(&output.stdout)?;

    let duration_sec: f64 = parsed
        .format
        .duration
        .unwrap_or("0".to_string())
        .parse()
        .unwrap_or(0.0);

    let mut fps = 30.0;
    if let Some(stream) = parsed.streams.first() {
        let parts: Vec<&str> = stream.r_frame_rate.split('/').collect();
        if parts.len() == 2 {
            if let (Ok(num), Ok(den)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                if den > 0.0 {
                    fps = num / den;
                }
            }
        }
    }

    Ok(VideoInfo { duration_sec, fps })
}

pub async fn extract_frame(app_handle: &AppHandle, file_path: &Path, time_ms: i64) -> Result<Vec<u8>> {
    let time_sec = time_ms as f64 / 1000.0;
    
    let sidecar_command = app_handle
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
        
    let output = sidecar_command
        .args([
            "-ss",
            &time_sec.to_string(),
            "-i",
            file_path.to_str().unwrap(),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            "-f",
            "image2pipe",
            "-vcodec",
            "mjpeg",
            "-",
        ])
        .output()
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    if !output.status.success() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "ffmpeg frame extraction failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ),
        ));
    }

    Ok(output.stdout)
}

pub async fn export_segment(
    app_handle: &AppHandle,
    input_path: &Path,
    output_path: &Path,
    start_ms: i64,
    end_ms: i64,
) -> Result<()> {
    let start_sec = start_ms as f64 / 1000.0;
    let end_sec = end_ms as f64 / 1000.0;
    let duration = end_sec - start_sec;

    let preseek = if start_sec > 10.0 {
        start_sec - 10.0
    } else {
        0.0
    };
    let exact_ss = start_sec - preseek;

    let sidecar_command = app_handle
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    let output = sidecar_command
        .args([
            "-y",
            "-ss",
            &preseek.to_string(),
            "-i",
            input_path.to_str().unwrap(),
            "-ss",
            &exact_ss.to_string(),
            "-t",
            &duration.to_string(),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            output_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        eprintln!("FFmpeg Export Failed! Stderr: {}", err_msg);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("FFmpeg export failed: {}", err_msg),
        ));
    }

    Ok(())
}
