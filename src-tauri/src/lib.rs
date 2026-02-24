pub mod commands;
pub mod db;
pub mod ffmpeg;
pub mod file_manager;

use commands::AppState;
use std::sync::Mutex;

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::thread;
use tiny_http::{Header, Response, Server, StatusCode};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            thread::spawn(|| {
                let server = Server::http("127.0.0.1:50123").unwrap();
                println!("Localhost proxy server listening on port 50123");

                for request in server.incoming_requests() {
                    let url = request.url().to_string();
                    if !url.starts_with("/video?path=") {
                        let _ = request.respond(Response::empty(404));
                        continue;
                    }

                    let encoded_path = url.replace("/video?path=", "");
                    let path_str = urlencoding::decode(&encoded_path)
                        .unwrap_or_else(|_| std::borrow::Cow::Borrowed(&encoded_path))
                        .into_owned();

                    let mut file = match File::open(&path_str) {
                        Ok(f) => f,
                        Err(_) => {
                            let _ = request.respond(Response::empty(404));
                            continue;
                        }
                    };

                    let file_size = file.metadata().unwrap().len();

                    let mut start = 0;
                    let mut end = file_size - 1;
                    let mut is_range = false;

                    let headers = request.headers();
                    for h in headers {
                        if h.field.equiv("Range") {
                            is_range = true;
                            let range_str = h.value.as_str().replace("bytes=", "");
                            let parts: Vec<&str> = range_str.split('-').collect();
                            if !parts.is_empty() {
                                start = parts[0].parse().unwrap_or(0);
                            }
                            if parts.len() > 1 && !parts[1].is_empty() {
                                end = parts[1].parse().unwrap_or(file_size - 1);
                            }
                        }
                    }

                    if start >= file_size {
                        let _ = request.respond(Response::empty(416));
                        continue;
                    }
                    if end >= file_size {
                        end = file_size - 1;
                    }

                    // 5MB chunks
                    let max_chunk = 5 * 1024 * 1024;
                    let mut length = end - start + 1;
                    if length > max_chunk {
                        length = max_chunk;
                        end = start + length - 1;
                    }

                    file.seek(SeekFrom::Start(start)).unwrap();
                    let mut buffer = vec![0; length as usize];
                    file.read_exact(&mut buffer).unwrap_or(());

                    let mut response = Response::from_data(buffer);

                    if is_range {
                        response = response.with_status_code(StatusCode(206));
                        response.add_header(
                            Header::from_bytes(
                                &b"Content-Range"[..],
                                format!("bytes {}-{}/{}", start, end, file_size).as_bytes(),
                            )
                            .unwrap(),
                        );
                    } else {
                        response = response.with_status_code(StatusCode(200));
                    }

                    response.add_header(
                        Header::from_bytes(&b"Content-Type"[..], &b"video/mp4"[..]).unwrap(),
                    );
                    response.add_header(
                        Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap(),
                    );
                    response.add_header(
                        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                    );

                    let _ = request.respond(response);
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            db: Mutex::new(None),
            work_dir: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::select_working_folder,
            commands::scan_and_get_clips,
            commands::open_clip,
            commands::get_segments,
            commands::add_segment,
            commands::delete_segment,
            commands::update_segment_label,
            commands::update_segment_bounds,
            commands::get_video_info,
            commands::extract_frame,
            commands::export_segments,
            commands::test_ffmpeg
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
