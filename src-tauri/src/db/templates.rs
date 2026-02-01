use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub id: i64,
    pub name: String,
    pub style_json: String,
    pub preview: Option<String>,
    pub is_default: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTemplate {
    pub name: String,
    pub style_json: String,
    pub preview: Option<String>,
    pub is_default: Option<bool>,
}

/// List all templates
pub fn list_templates(conn: &Connection) -> Result<Vec<Template>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, name, style_json, preview, is_default, created_at
        FROM templates
        ORDER BY is_default DESC, created_at DESC
        "#,
    )?;

    let items = stmt
        .query_map([], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                style_json: row.get(2)?,
                preview: row.get(3)?,
                is_default: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
}

/// Get a template by ID
pub fn get_template(conn: &Connection, id: i64) -> Result<Option<Template>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, name, style_json, preview, is_default, created_at
        FROM templates
        WHERE id = ?1
        "#,
    )?;

    let result = stmt.query_row(params![id], |row| {
        Ok(Template {
            id: row.get(0)?,
            name: row.get(1)?,
            style_json: row.get(2)?,
            preview: row.get(3)?,
            is_default: row.get::<_, i64>(4)? != 0,
            created_at: row.get(5)?,
        })
    });

    match result {
        Ok(template) => Ok(Some(template)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Save a new template
pub fn save_template(conn: &Connection, template: &NewTemplate) -> Result<i64, rusqlite::Error> {
    conn.execute(
        r#"
        INSERT INTO templates (name, style_json, preview, is_default)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        params![
            template.name,
            template.style_json,
            template.preview,
            template.is_default.unwrap_or(false) as i64
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

/// Update a template
pub fn update_template(
    conn: &Connection,
    id: i64,
    template: &NewTemplate,
) -> Result<bool, rusqlite::Error> {
    let affected = conn.execute(
        r#"
        UPDATE templates
        SET name = ?1, style_json = ?2, preview = ?3, is_default = ?4
        WHERE id = ?5
        "#,
        params![
            template.name,
            template.style_json,
            template.preview,
            template.is_default.unwrap_or(false) as i64,
            id
        ],
    )?;

    Ok(affected > 0)
}

/// Delete a template
pub fn delete_template(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let affected = conn.execute("DELETE FROM templates WHERE id = ?1", params![id])?;
    Ok(affected > 0)
}

/// Set a template as default (unsets others)
pub fn set_default_template(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    // Unset all defaults
    conn.execute("UPDATE templates SET is_default = 0", [])?;

    // Set the new default
    let affected = conn.execute(
        "UPDATE templates SET is_default = 1 WHERE id = ?1",
        params![id],
    )?;

    Ok(affected > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                style_json TEXT NOT NULL,
                preview TEXT,
                is_default INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
            "#,
        )
        .unwrap();
        conn
    }

    fn create_test_template(name: &str) -> NewTemplate {
        NewTemplate {
            name: name.to_string(),
            style_json: r#"{"dotStyle":"rounded"}"#.to_string(),
            preview: None,
            is_default: None,
        }
    }

    #[test]
    fn test_save_template() {
        let conn = setup_test_db();
        let template = create_test_template("Classic");

        let id = save_template(&conn, &template).unwrap();
        assert!(id > 0);

        let templates = list_templates(&conn).unwrap();
        assert_eq!(templates.len(), 1);
    }

    #[test]
    fn test_save_template_with_all_fields() {
        let conn = setup_test_db();
        let style = r##"{"dotStyle":"dots","foreground":"#000"}"##;
        let template = NewTemplate {
            name: "Modern".to_string(),
            style_json: style.to_string(),
            preview: Some("data:image/png;base64,preview".to_string()),
            is_default: Some(true),
        };

        let id = save_template(&conn, &template).unwrap();
        let retrieved = get_template(&conn, id).unwrap().unwrap();

        assert_eq!(retrieved.name, "Modern");
        assert!(retrieved.is_default);
        assert_eq!(retrieved.preview, Some("data:image/png;base64,preview".to_string()));
    }

    #[test]
    fn test_list_templates_empty() {
        let conn = setup_test_db();
        let templates = list_templates(&conn).unwrap();
        assert!(templates.is_empty());
    }

    #[test]
    fn test_list_templates_ordered_by_default() {
        let conn = setup_test_db();

        save_template(&conn, &create_test_template("First")).unwrap();
        save_template(&conn, &create_test_template("Second")).unwrap();

        let mut default_template = create_test_template("Default");
        default_template.is_default = Some(true);
        save_template(&conn, &default_template).unwrap();

        let templates = list_templates(&conn).unwrap();
        assert_eq!(templates.len(), 3);
        // Default should come first
        assert_eq!(templates[0].name, "Default");
        assert!(templates[0].is_default);
    }

    #[test]
    fn test_get_template() {
        let conn = setup_test_db();

        let style = r##"{"foreground":"#ff0000"}"##;
        let template = NewTemplate {
            name: "Test Template".to_string(),
            style_json: style.to_string(),
            preview: None,
            is_default: None,
        };

        let id = save_template(&conn, &template).unwrap();
        let retrieved = get_template(&conn, id).unwrap();

        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, id);
        assert_eq!(retrieved.name, "Test Template");
        assert_eq!(retrieved.style_json, style);
    }

    #[test]
    fn test_get_template_nonexistent() {
        let conn = setup_test_db();
        let result = get_template(&conn, 9999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_template() {
        let conn = setup_test_db();

        let id = save_template(&conn, &create_test_template("Original")).unwrap();

        let updated = NewTemplate {
            name: "Updated".to_string(),
            style_json: r#"{"dotStyle":"square"}"#.to_string(),
            preview: Some("new-preview".to_string()),
            is_default: Some(true),
        };

        let success = update_template(&conn, id, &updated).unwrap();
        assert!(success);

        let retrieved = get_template(&conn, id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Updated");
        assert_eq!(retrieved.style_json, r#"{"dotStyle":"square"}"#);
        assert_eq!(retrieved.preview, Some("new-preview".to_string()));
        assert!(retrieved.is_default);
    }

    #[test]
    fn test_update_template_nonexistent() {
        let conn = setup_test_db();

        let updated = create_test_template("Test");
        let success = update_template(&conn, 9999, &updated).unwrap();
        assert!(!success);
    }

    #[test]
    fn test_delete_template() {
        let conn = setup_test_db();

        let id = save_template(&conn, &create_test_template("To Delete")).unwrap();
        assert_eq!(list_templates(&conn).unwrap().len(), 1);

        let deleted = delete_template(&conn, id).unwrap();
        assert!(deleted);
        assert!(list_templates(&conn).unwrap().is_empty());
    }

    #[test]
    fn test_delete_template_nonexistent() {
        let conn = setup_test_db();

        let deleted = delete_template(&conn, 9999).unwrap();
        assert!(!deleted);
    }

    #[test]
    fn test_set_default_template() {
        let conn = setup_test_db();

        let id1 = save_template(&conn, &create_test_template("Template 1")).unwrap();
        let id2 = save_template(&conn, &create_test_template("Template 2")).unwrap();

        // Set first as default
        let success = set_default_template(&conn, id1).unwrap();
        assert!(success);

        let t1 = get_template(&conn, id1).unwrap().unwrap();
        let t2 = get_template(&conn, id2).unwrap().unwrap();
        assert!(t1.is_default);
        assert!(!t2.is_default);

        // Change default to second
        let success = set_default_template(&conn, id2).unwrap();
        assert!(success);

        let t1 = get_template(&conn, id1).unwrap().unwrap();
        let t2 = get_template(&conn, id2).unwrap().unwrap();
        assert!(!t1.is_default);
        assert!(t2.is_default);
    }

    #[test]
    fn test_set_default_template_nonexistent() {
        let conn = setup_test_db();

        // Should return false because no rows were updated
        let success = set_default_template(&conn, 9999).unwrap();
        assert!(!success);
    }

    #[test]
    fn test_set_default_template_unsets_others() {
        let conn = setup_test_db();

        // Create 3 templates, all initially default (edge case)
        let mut t1 = create_test_template("T1");
        t1.is_default = Some(true);
        let id1 = save_template(&conn, &t1).unwrap();

        let mut t2 = create_test_template("T2");
        t2.is_default = Some(true);
        let id2 = save_template(&conn, &t2).unwrap();

        let mut t3 = create_test_template("T3");
        t3.is_default = Some(true);
        let id3 = save_template(&conn, &t3).unwrap();

        // Set only t2 as default
        set_default_template(&conn, id2).unwrap();

        let templates = list_templates(&conn).unwrap();
        let default_count = templates.iter().filter(|t| t.is_default).count();
        assert_eq!(default_count, 1);
        assert!(get_template(&conn, id2).unwrap().unwrap().is_default);
        assert!(!get_template(&conn, id1).unwrap().unwrap().is_default);
        assert!(!get_template(&conn, id3).unwrap().unwrap().is_default);
    }

    #[test]
    fn test_template_created_at_is_set() {
        let conn = setup_test_db();

        let id = save_template(&conn, &create_test_template("Test")).unwrap();
        let template = get_template(&conn, id).unwrap().unwrap();

        assert!(!template.created_at.is_empty());
    }
}
