-- FlowSpace — Supabase Database Schema
-- Run this in the Supabase SQL Editor after creating a new project.

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
-- Mirrors auth.users. ID is the same UUID as auth.users.id.
-- Populated automatically by the trigger below.

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ,
  is_admin        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ─── Subscriptions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id      VARCHAR(255) UNIQUE,            -- NULL until user upgrades
  stripe_subscription_id  VARCHAR(255) UNIQUE,            -- NULL until user upgrades
  stripe_price_id         VARCHAR(255),
  tier                    VARCHAR(20)  NOT NULL DEFAULT 'free',
  status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN      NOT NULL DEFAULT FALSE,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tier_check   CHECK (tier   IN ('free', 'pro')),
  CONSTRAINT status_check CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused'))
);

-- ─── Devices ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.devices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL DEFAULT 'Browser Extension',
  browser       VARCHAR(20),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT browser_check CHECK (browser IN ('chrome', 'firefox', 'edge', 'brave', 'safari'))
);

-- ─── Workspaces ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspaces (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  icon          VARCHAR(50),
  color         VARCHAR(7),
  shortcut_key  SMALLINT    CHECK (shortcut_key BETWEEN 1 AND 9),
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  layout_json   JSONB,                                    -- NULL = empty workspace
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_shortcut_per_user UNIQUE (user_id, shortcut_key)
);

-- ─── Tiles ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  title         VARCHAR(255),
  favicon_url   TEXT,
  open_mode     VARCHAR(10) NOT NULL DEFAULT 'iframe',
  is_pinned     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT open_mode_check CHECK (open_mode IN ('iframe', 'tab'))
);

-- ─── Auth Extension Codes ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.auth_extension_codes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code              VARCHAR(64) UNIQUE NOT NULL,
  state             VARCHAR(128) NOT NULL,
  encrypted_tokens  TEXT        NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes'),
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Workspace Templates ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  icon         VARCHAR(50),
  is_official  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  use_count    INTEGER     NOT NULL DEFAULT 0,
  layout_json  JSONB       NOT NULL,
  tiles_json   JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id        ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id              ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id           ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_sort_order        ON public.workspaces(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tiles_workspace_id           ON public.tiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_code              ON public.auth_extension_codes(code);
CREATE INDEX IF NOT EXISTS idx_auth_codes_expires           ON public.auth_extension_codes(expires_at)
  WHERE used_at IS NULL;                                    -- partial index: only unexpired

-- ─── Triggers ─────────────────────────────────────────────────────────────────

-- When Supabase Auth creates a new user, create the corresponding public.users
-- row and an initial free subscription automatically.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Keep public.users.email in sync when auth.users.email changes (e.g. email update)
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email, updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_auth_user_email_update();

-- Cleanup: delete expired and used auth_extension_codes once per day.
-- In Supabase, use pg_cron or a scheduled Edge Function to call this.
CREATE OR REPLACE FUNCTION public.cleanup_extension_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.auth_extension_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR used_at IS NOT NULL;
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The backend API uses the service role key which bypasses RLS.
-- RLS is a defence-in-depth measure — it protects the data even if
-- a bug causes the wrong Supabase client to be used.

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_extension_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_templates  ENABLE ROW LEVEL SECURITY;

-- users: only own row
CREATE POLICY "users: select own"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users: update own"   ON public.users FOR UPDATE USING (auth.uid() = id);

-- subscriptions: only own
CREATE POLICY "subscriptions: select own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- devices: only own, non-revoked
CREATE POLICY "devices: select own"  ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "devices: update own"  ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "devices: delete own"  ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- workspaces: full CRUD on own
CREATE POLICY "workspaces: select own" ON public.workspaces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workspaces: insert own" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workspaces: update own" ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workspaces: delete own" ON public.workspaces FOR DELETE USING (auth.uid() = user_id);

-- tiles: accessible through workspace ownership
CREATE POLICY "tiles: select own" ON public.tiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = tiles.workspace_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "tiles: insert own" ON public.tiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = tiles.workspace_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "tiles: update own" ON public.tiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = tiles.workspace_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "tiles: delete own" ON public.tiles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = tiles.workspace_id AND w.user_id = auth.uid()
  ));

-- auth_extension_codes: no direct client access (service role only)
-- No policies = no access for non-service clients.

-- workspace_templates: anyone authenticated can read
CREATE POLICY "templates: select authenticated" ON public.workspace_templates
  FOR SELECT USING (auth.role() = 'authenticated');
-- Insert/update only via service role (no policy = no client access)
