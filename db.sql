-- Tabla para guardar los tokens de Hike (corre esto UNA vez en Neon).
CREATE TABLE IF NOT EXISTS hike_tokens (
  id            SERIAL PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  access_token  TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
