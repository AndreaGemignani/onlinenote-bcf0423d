CREATE TABLE public.shared_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  owner_secret_hash text NOT NULL,
  title text NOT NULL DEFAULT '',
  content_json jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shared_notes TO service_role;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;