use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub original_name: String,
    pub backup_path: String,
    pub status: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Segment {
    pub id: String,
    pub clip_id: String,
    pub idx: i64,
    pub start_ms: i64,
    pub end_ms: i64,
    pub label: Option<String>,
}

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS clips (
            id TEXT PRIMARY KEY,
            original_name TEXT NOT NULL,
            backup_path TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS segments (
            id TEXT PRIMARY KEY,
            clip_id TEXT NOT NULL,
            idx INTEGER NOT NULL,
            start_ms INTEGER NOT NULL,
            end_ms INTEGER NOT NULL,
            label TEXT,
            FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(conn)
}

pub fn insert_clip(conn: &Connection, clip: &Clip) -> Result<()> {
    conn.execute(
        "INSERT INTO clips (id, original_name, backup_path, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            clip.id,
            clip.original_name,
            clip.backup_path,
            clip.status,
            clip.created_at
        ],
    )?;
    Ok(())
}

pub fn get_clips(conn: &Connection) -> Result<Vec<Clip>> {
    let mut stmt = conn.prepare("SELECT id, original_name, backup_path, status, created_at FROM clips ORDER BY created_at DESC")?;
    let clip_iter = stmt.query_map([], |row| {
        Ok(Clip {
            id: row.get(0)?,
            original_name: row.get(1)?,
            backup_path: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    let mut clips = Vec::new();
    for clip in clip_iter {
        clips.push(clip?);
    }
    Ok(clips)
}

pub fn update_clip_status(conn: &Connection, id: &str, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE clips SET status = ?1 WHERE id = ?2",
        params![status, id],
    )?;
    Ok(())
}

pub fn insert_segment(conn: &Connection, segment: &Segment) -> Result<()> {
    conn.execute(
        "INSERT INTO segments (id, clip_id, idx, start_ms, end_ms, label)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            segment.id,
            segment.clip_id,
            segment.idx,
            segment.start_ms,
            segment.end_ms,
            segment.label
        ],
    )?;
    Ok(())
}

pub fn get_segments(conn: &Connection, clip_id: &str) -> Result<Vec<Segment>> {
    let mut stmt = conn.prepare("SELECT id, clip_id, idx, start_ms, end_ms, label FROM segments WHERE clip_id = ?1 ORDER BY idx ASC")?;
    let segment_iter = stmt.query_map(params![clip_id], |row| {
        Ok(Segment {
            id: row.get(0)?,
            clip_id: row.get(1)?,
            idx: row.get(2)?,
            start_ms: row.get(3)?,
            end_ms: row.get(4)?,
            label: row.get(5)?,
        })
    })?;

    let mut segments = Vec::new();
    for split in segment_iter {
        segments.push(split?);
    }
    Ok(segments)
}

pub fn update_segment(
    conn: &Connection,
    id: &str,
    start_ms: i64,
    end_ms: i64,
    label: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE segments SET start_ms = ?1, end_ms = ?2, label = ?3 WHERE id = ?4",
        params![start_ms, end_ms, label, id],
    )?;
    Ok(())
}

pub fn delete_segment(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM segments WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_clip_by_original_name(conn: &Connection, name: &str) -> Result<Option<Clip>> {
    let mut stmt = conn.prepare("SELECT id, original_name, backup_path, status, created_at FROM clips WHERE original_name = ?1")?;
    let mut clip_iter = stmt.query_map(params![name], |row| {
        Ok(Clip {
            id: row.get(0)?,
            original_name: row.get(1)?,
            backup_path: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    if let Some(res) = clip_iter.next() {
        Ok(Some(res?))
    } else {
        Ok(None)
    }
}
