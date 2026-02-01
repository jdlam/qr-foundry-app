use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub id: i64,
    pub content: String,
    pub qr_type: String,
    pub label: Option<String>,
    pub style_json: String,
    pub thumbnail: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewHistoryItem {
    pub content: String,
    pub qr_type: String,
    pub label: Option<String>,
    pub style_json: String,
    pub thumbnail: Option<String>,
}

/// List history items with pagination
pub fn list_history(
    conn: &Connection,
    limit: i64,
    offset: i64,
    search: Option<&str>,
) -> Result<Vec<HistoryItem>, rusqlite::Error> {
    let mut stmt = if let Some(search_term) = search {
        let query = r#"
            SELECT id, content, qr_type, label, style_json, thumbnail, created_at, updated_at
            FROM history
            WHERE content LIKE ?1 OR label LIKE ?1
            ORDER BY created_at DESC
            LIMIT ?2 OFFSET ?3
        "#;
        let mut stmt = conn.prepare(query)?;
        let search_pattern = format!("%{}%", search_term);
        let items = stmt
            .query_map(params![search_pattern, limit, offset], |row| {
                Ok(HistoryItem {
                    id: row.get(0)?,
                    content: row.get(1)?,
                    qr_type: row.get(2)?,
                    label: row.get(3)?,
                    style_json: row.get(4)?,
                    thumbnail: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        return Ok(items);
    } else {
        conn.prepare(
            r#"
            SELECT id, content, qr_type, label, style_json, thumbnail, created_at, updated_at
            FROM history
            ORDER BY created_at DESC
            LIMIT ?1 OFFSET ?2
        "#,
        )?
    };

    let items = stmt
        .query_map(params![limit, offset], |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                content: row.get(1)?,
                qr_type: row.get(2)?,
                label: row.get(3)?,
                style_json: row.get(4)?,
                thumbnail: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
}

/// Save a new history item
pub fn save_history(conn: &Connection, item: &NewHistoryItem) -> Result<i64, rusqlite::Error> {
    conn.execute(
        r#"
        INSERT INTO history (content, qr_type, label, style_json, thumbnail)
        VALUES (?1, ?2, ?3, ?4, ?5)
        "#,
        params![
            item.content,
            item.qr_type,
            item.label,
            item.style_json,
            item.thumbnail
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

/// Delete a history item
pub fn delete_history(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let affected = conn.execute("DELETE FROM history WHERE id = ?1", params![id])?;
    Ok(affected > 0)
}

/// Clear all history
pub fn clear_history(conn: &Connection) -> Result<i64, rusqlite::Error> {
    let affected = conn.execute("DELETE FROM history", [])?;
    Ok(affected as i64)
}

/// Get history count
pub fn count_history(conn: &Connection) -> Result<i64, rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM history", [], |row| row.get(0))?;
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                qr_type TEXT NOT NULL,
                label TEXT,
                style_json TEXT NOT NULL,
                thumbnail TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            "#,
        )
        .unwrap();
        conn
    }

    fn create_test_item(content: &str, qr_type: &str) -> NewHistoryItem {
        NewHistoryItem {
            content: content.to_string(),
            qr_type: qr_type.to_string(),
            label: None,
            style_json: "{}".to_string(),
            thumbnail: None,
        }
    }

    #[test]
    fn test_save_history() {
        let conn = setup_test_db();
        let item = create_test_item("https://example.com", "url");

        let id = save_history(&conn, &item).unwrap();
        assert!(id > 0);

        let count = count_history(&conn).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_save_history_with_all_fields() {
        let conn = setup_test_db();
        let item = NewHistoryItem {
            content: "tel:+15551234567".to_string(),
            qr_type: "phone".to_string(),
            label: Some("Work Phone".to_string()),
            style_json: r#"{"dotStyle":"rounded"}"#.to_string(),
            thumbnail: Some("data:image/png;base64,abc".to_string()),
        };

        let id = save_history(&conn, &item).unwrap();
        assert!(id > 0);
    }

    #[test]
    fn test_list_history_empty() {
        let conn = setup_test_db();
        let items = list_history(&conn, 50, 0, None).unwrap();
        assert!(items.is_empty());
    }

    #[test]
    fn test_list_history_with_items() {
        let conn = setup_test_db();

        save_history(&conn, &create_test_item("https://one.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://two.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://three.com", "url")).unwrap();

        let items = list_history(&conn, 50, 0, None).unwrap();
        assert_eq!(items.len(), 3);
    }

    #[test]
    fn test_list_history_pagination() {
        let conn = setup_test_db();

        for i in 0..10 {
            save_history(&conn, &create_test_item(&format!("https://{}.com", i), "url")).unwrap();
        }

        let page1 = list_history(&conn, 3, 0, None).unwrap();
        assert_eq!(page1.len(), 3);

        let page2 = list_history(&conn, 3, 3, None).unwrap();
        assert_eq!(page2.len(), 3);

        let page3 = list_history(&conn, 3, 6, None).unwrap();
        assert_eq!(page3.len(), 3);

        let page4 = list_history(&conn, 3, 9, None).unwrap();
        assert_eq!(page4.len(), 1);
    }

    #[test]
    fn test_list_history_search() {
        let conn = setup_test_db();

        save_history(&conn, &create_test_item("https://example.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://test.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://example.org", "url")).unwrap();

        let results = list_history(&conn, 50, 0, Some("example")).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_list_history_search_by_label() {
        let conn = setup_test_db();

        let mut item1 = create_test_item("https://one.com", "url");
        item1.label = Some("Work Project".to_string());
        save_history(&conn, &item1).unwrap();

        let mut item2 = create_test_item("https://two.com", "url");
        item2.label = Some("Personal".to_string());
        save_history(&conn, &item2).unwrap();

        let results = list_history(&conn, 50, 0, Some("Work")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].label, Some("Work Project".to_string()));
    }

    #[test]
    fn test_delete_history() {
        let conn = setup_test_db();

        let id = save_history(&conn, &create_test_item("https://delete.me", "url")).unwrap();
        assert_eq!(count_history(&conn).unwrap(), 1);

        let deleted = delete_history(&conn, id).unwrap();
        assert!(deleted);
        assert_eq!(count_history(&conn).unwrap(), 0);
    }

    #[test]
    fn test_delete_history_nonexistent() {
        let conn = setup_test_db();

        let deleted = delete_history(&conn, 9999).unwrap();
        assert!(!deleted);
    }

    #[test]
    fn test_clear_history() {
        let conn = setup_test_db();

        save_history(&conn, &create_test_item("https://one.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://two.com", "url")).unwrap();
        save_history(&conn, &create_test_item("https://three.com", "url")).unwrap();

        assert_eq!(count_history(&conn).unwrap(), 3);

        let deleted_count = clear_history(&conn).unwrap();
        assert_eq!(deleted_count, 3);
        assert_eq!(count_history(&conn).unwrap(), 0);
    }

    #[test]
    fn test_clear_history_empty() {
        let conn = setup_test_db();

        let deleted_count = clear_history(&conn).unwrap();
        assert_eq!(deleted_count, 0);
    }

    #[test]
    fn test_count_history() {
        let conn = setup_test_db();

        assert_eq!(count_history(&conn).unwrap(), 0);

        save_history(&conn, &create_test_item("https://one.com", "url")).unwrap();
        assert_eq!(count_history(&conn).unwrap(), 1);

        save_history(&conn, &create_test_item("https://two.com", "url")).unwrap();
        assert_eq!(count_history(&conn).unwrap(), 2);
    }

    #[test]
    fn test_history_item_fields() {
        let conn = setup_test_db();

        let style = r##"{"foreground":"#ff0000"}"##;
        let item = NewHistoryItem {
            content: "https://example.com".to_string(),
            qr_type: "url".to_string(),
            label: Some("My Link".to_string()),
            style_json: style.to_string(),
            thumbnail: Some("data:image/png;base64,thumb".to_string()),
        };

        save_history(&conn, &item).unwrap();
        let items = list_history(&conn, 1, 0, None).unwrap();

        assert_eq!(items.len(), 1);
        let retrieved = &items[0];
        assert_eq!(retrieved.content, "https://example.com");
        assert_eq!(retrieved.qr_type, "url");
        assert_eq!(retrieved.label, Some("My Link".to_string()));
        assert_eq!(retrieved.style_json, style);
        assert_eq!(retrieved.thumbnail, Some("data:image/png;base64,thumb".to_string()));
        assert!(!retrieved.created_at.is_empty());
        assert!(!retrieved.updated_at.is_empty());
    }
}
