-- Portal-owned credentials table.
-- The portal writes here when a patron resets their agent's password.
-- The game server checks this table first (raw SQL) on login, falling back to
-- the legacy password_hash attribute for characters not yet reset.

CREATE TABLE portal_character_credentials (
    character_id BIGINT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
