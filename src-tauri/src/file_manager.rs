use std::fs;
use std::path::{Path, PathBuf};
use std::io::Result;

#[derive(Clone)]
pub struct WorkingDirectory {
    pub root: PathBuf,
    pub in_dir: PathBuf,
    pub out_dir: PathBuf,
    pub backup_dir: PathBuf,
    pub db_path: PathBuf,
}

impl WorkingDirectory {
    pub fn new(root: &Path) -> Result<Self> {
        let in_dir = root.join("IN");
        let out_dir = root.join("OUT");
        let backup_dir = root.join("BACKUP");
        let cliptrim_dir = root.join(".cliptrim");
        let db_path = cliptrim_dir.join("cliptrim.db");

        fs::create_dir_all(&in_dir)?;
        fs::create_dir_all(&out_dir)?;
        fs::create_dir_all(&backup_dir)?;
        fs::create_dir_all(&cliptrim_dir)?;

        Ok(Self {
            root: root.to_path_buf(),
            in_dir,
            out_dir,
            backup_dir,
            db_path,
        })
    }

    pub fn scan_in_folder(&self) -> Result<Vec<PathBuf>> {
        let mut entries = Vec::new();
        if self.in_dir.exists() {
            for entry in fs::read_dir(&self.in_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext.to_string_lossy().to_lowercase() == "mp4" {
                            entries.push(path);
                        }
                    }
                }
            }
        }
        Ok(entries)
    }

    pub fn move_to_backup(&self, file_path: &Path) -> Result<PathBuf> {
        let file_name = file_path.file_name().unwrap().to_string_lossy();
        let file_stem = file_path.file_stem().unwrap().to_string_lossy();
        let ext = file_path.extension().unwrap().to_string_lossy();

        let mut target_path = self.backup_dir.join(file_name.as_ref());
        let mut counter = 2;

        while target_path.exists() {
            let new_name = format!("{}_orig_v{}.{}", file_stem, counter, ext);
            target_path = self.backup_dir.join(new_name);
            counter += 1;
        }

        fs::rename(file_path, &target_path)?;
        Ok(target_path)
    }
}
