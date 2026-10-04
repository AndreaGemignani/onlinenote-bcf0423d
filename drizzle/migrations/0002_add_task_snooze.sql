ALTER TABLE public.daily_tasks ADD COLUMN snoozed_until timestamptz;
ALTER TABLE public.telegram_prompts ADD COLUMN message_id bigint;