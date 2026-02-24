# ClipTrim

ClipTrim is a high-speed, keyboard-first Tauri application designed to quickly trim frame-perfect segment segments from many MP4 clips.

## Build Instructions

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/setup/) (`cargo install tauri-cli` or `npm install @tauri-apps/cli`)
- OS: Windows 11

### How to Bundle FFmpeg
ClipTrim requires `ffmpeg` and `ffprobe` as Tauri Sidecars.
1. Download static Windows binaries for FFmpeg and FFprobe from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or similar.
2. Extract the binaries.
3. Place `ffmpeg.exe` and `ffprobe.exe` into: `src-tauri/bin/` 
4. Rename them exactly to match the target triple (important for Tauri Sidecar):
   - `ffmpeg-x86_64-pc-windows-msvc.exe`
   - `ffprobe-x86_64-pc-windows-msvc.exe`

### Running Locally
To verify the sidecar integration in dev mode:
```bash
npm install
npm run tauri dev
```
- Click the **Verify FFmpeg** button in the top right corner. 
- You should see an alert with the FFmpeg version, confirming that the isolated sidecar bundle has executed correctly without relying on the system `PATH`.

### Packaging for Release
```bash
npm run tauri build
```
The standard Windows Installer (`.msi`) will be generated in `src-tauri/target/release/bundle`.

---

## Folder Layout Behavior

ClipTrim uses a structured **Working Folder** to keep your files organized.

When you select a Working Folder, the app automatically creates:
- `IN/`: Place all your new `.mp4` clips here. The app scans this folder.
- `OUT/`: Exported, trimmed segments are saved here.
- `BACKUP/`: Original files are moved here instantly upon being opened to prevent accidental deletion or modification.
- `.cliptrim/`: Contains the SQLite database (`cliptrim.db`) storing metadata and segments.

### How BACKUP Behavior Works
ClipTrim operates completely non-destructively:
1. When you first open an `.mp4` file from the `IN/` folder in the app, it is immediately **MOVED** to the `BACKUP/` folder.
2. Its path is recorded in `.cliptrim/cliptrim.db`.
3. If a file with the same name already exists in `BACKUP/`, the original will be automatically renamed (e.g., `video_orig_v2.mp4`) to avoid collisions.
4. **Exported segments** never overwrite the original; they are placed strictly into `OUT/`.

---

## Keyboard Shortcuts

The player interface is completely keyboard-driven:

| Key | Action |
|-----|--------|
| **Space** | Play/Pause |
| **I** | Set IN marker (Start of segment) |
| **O** | Set OUT marker (End of segment) |
| **A** | Add segment to the Segment List |
| **Delete / Backspace** | Delete the latest/selected segment |
| **Enter** | Export all added segments |
| **N** | Next clip |
| **P** | Previous clip |
| **, (Comma)** | Step one frame backward |
| **. (Period)** | Step one frame forward |
