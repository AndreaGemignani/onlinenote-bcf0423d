-- Owner = a device/workspace identified by an unguessable UUID stored locally.
CREATE TABLE public.task_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_code text NOT NULL UNIQUE,
  telegram_chat_id bigint,
  telegram_username text,
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.task_owners(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  title text NOT NULL,
  due_time time,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  reminded_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_tasks_owner_date ON public.daily_tasks (owner_id, task_date);
CREATE INDEX idx_daily_tasks_due ON public.daily_tasks (task_date, due_time) WHERE completed = false;

-- Idempotency + reply routing for Telegram
CREATE TABLE public.telegram_updates (
  update_id bigint PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.telegram_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  task_id uuid NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_prompts_chat ON public.telegram_prompts (chat_id, answered, created_at DESC);

-- All access goes through edge functions with the service role.
GRANT ALL ON public.task_owners TO service_role;
GRANT ALL ON public.daily_tasks TO service_role;
GRANT ALL ON public.telegram_updates TO service_role;
GRANT ALL ON public.telegram_prompts TO service_role;

ALTER TABLE public.task_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_prompts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_tasks_touch
BEFORE UPDATE ON public.daily_tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();