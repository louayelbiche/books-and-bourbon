-- bot-memory schema v1
-- Customer memory system: visitor profiles, conversations, messages

CREATE TABLE IF NOT EXISTS bot_visitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key TEXT NOT NULL,
  visitor_type TEXT NOT NULL,
  source_app TEXT NOT NULL,
  tenant_id TEXT,
  profile_json JSONB NOT NULL DEFAULT '{"facts":[],"last_conversation_summary":""}',
  visit_count INTEGER NOT NULL DEFAULT 1,
  total_messages INTEGER NOT NULL DEFAULT 0,
  geo_region TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(visitor_key, source_app)
);

CREATE TABLE IF NOT EXISTS bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES bot_visitor_profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  source_app TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  message_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES bot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  response_latency_ms INTEGER,
  token_estimate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bvp_visitor_key ON bot_visitor_profiles(visitor_key, source_app);
CREATE INDEX IF NOT EXISTS idx_bvp_tenant ON bot_visitor_profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bvp_geo_updated ON bot_visitor_profiles(geo_region, updated_at);
CREATE INDEX IF NOT EXISTS idx_bc_visitor ON bot_conversations(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_session ON bot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_bm_conversation ON bot_messages(conversation_id, created_at);
