-- Create folder and file tables

CREATE TABLE IF NOT EXISTS "folder" (
	id TEXT NOT NULL,
	parent_id TEXT,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	items JSON,
	meta JSON,
	is_expanded BOOLEAN NOT NULL,
	created_at BIGINT NOT NULL,
	updated_at BIGINT NOT NULL,
	data JSON,
	PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS "file" (
	id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	filename TEXT NOT NULL,
	meta JSON,
	created_at INTEGER NOT NULL,
	hash TEXT,
	data JSON,
	updated_at BIGINT,
	path TEXT,
	access_control JSON,
	PRIMARY KEY (id)
);


