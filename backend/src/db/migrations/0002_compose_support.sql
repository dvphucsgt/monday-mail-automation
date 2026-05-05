-- Migration 0002: Support for compose (ad-hoc) emails
-- Make item_id and template_id nullable, add subject column

CREATE TABLE IF NOT EXISTS email_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id TEXT NOT NULL,
  item_id TEXT,
  template_id INTEGER,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  error TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO email_logs_new (id, board_id, item_id, template_id, recipient, status, error, sent_at)
SELECT id, board_id, item_id, template_id, recipient, status, error, sent_at FROM email_logs;

DROP TABLE email_logs;

ALTER TABLE email_logs_new RENAME TO email_logs;

CREATE INDEX IF NOT EXISTS idx_email_logs_board_id ON email_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
