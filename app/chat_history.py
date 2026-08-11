"""Per-user conversation persistence for PulseFit."""

import json
from datetime import UTC, datetime

from app.auth import _connection


def initialize_chat_history_store():
    with _connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                mode TEXT NOT NULL,
                model_type TEXT NOT NULL,
                search_web INTEGER NOT NULL,
                document_ids TEXT NOT NULL DEFAULT '[]',
                timestamp INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_timestamp
                ON chat_sessions(user_id, timestamp DESC);
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT NOT NULL DEFAULT '[]',
                position INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_chat_messages_session_position
                ON chat_messages(session_id, position);
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(chat_sessions)")}
        if "document_ids" not in columns:
            connection.execute("ALTER TABLE chat_sessions ADD COLUMN document_ids TEXT NOT NULL DEFAULT '[]'")


def list_conversations(user_id: int):
    with _connection() as connection:
        sessions = connection.execute(
            "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY timestamp DESC", (user_id,)
        ).fetchall()
        result = []
        for session in sessions:
            messages = connection.execute(
                "SELECT role, content, sources FROM chat_messages WHERE session_id = ? ORDER BY position",
                (session["id"],),
            ).fetchall()
            result.append({
                "id": session["id"], "title": session["title"], "mode": session["mode"],
                "modelType": session["model_type"], "searchWeb": bool(session["search_web"]),
                "documentIds": json.loads(session["document_ids"]),
                "timestamp": session["timestamp"],
                "messages": [
                    {"role": message["role"], "content": message["content"],
                     "sources": json.loads(message["sources"])}
                    for message in messages
                ],
            })
    return result


def save_conversation(user_id: int, conversation: dict):
    """Replace one conversation only when it belongs to the authenticated user."""
    with _connection() as connection:
        existing = connection.execute(
            "SELECT user_id FROM chat_sessions WHERE id = ?", (conversation["id"],)
        ).fetchone()
        if existing and existing["user_id"] != user_id:
            return False

        connection.execute(
            """INSERT INTO chat_sessions
               (id, user_id, title, mode, model_type, search_web, document_ids, timestamp, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET title=excluded.title, mode=excluded.mode,
               model_type=excluded.model_type, search_web=excluded.search_web,
               document_ids=excluded.document_ids, timestamp=excluded.timestamp""",
            (conversation["id"], user_id, conversation["title"], conversation["mode"],
             conversation["modelType"], int(conversation["searchWeb"]),
             json.dumps(conversation.get("documentIds", [])), conversation["timestamp"],
             datetime.now(UTC).isoformat()),
        )
        connection.execute("DELETE FROM chat_messages WHERE session_id = ?", (conversation["id"],))
        connection.executemany(
            """INSERT INTO chat_messages (session_id, role, content, sources, position)
               VALUES (?, ?, ?, ?, ?)""",
            [(conversation["id"], message["role"], message["content"],
              json.dumps(message.get("sources", [])), position)
             for position, message in enumerate(conversation.get("messages", []))],
        )
    return True


def delete_conversation(user_id: int, conversation_id: str):
    with _connection() as connection:
        cursor = connection.execute(
            "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?", (conversation_id, user_id)
        )
    return cursor.rowcount > 0
