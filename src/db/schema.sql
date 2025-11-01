-- Database schema for Instagram Connect Demo
-- This schema supports multi-user authentication and persistent storage

-- Users table: stores application user accounts
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Meta accounts table: stores Facebook/Instagram user tokens
CREATE TABLE IF NOT EXISTS meta_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'long_lived',
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, meta_user_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_accounts_user_id ON meta_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_meta_user_id ON meta_accounts(meta_user_id);
CREATE INDEX IF NOT EXISTS idx_meta_accounts_expires_at ON meta_accounts(expires_at);

-- Pages table: stores Facebook Pages connected to user accounts
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_account_id INTEGER REFERENCES meta_accounts(id) ON DELETE CASCADE,
  page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255),
  page_access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_page_id ON pages(page_id);
CREATE INDEX IF NOT EXISTS idx_pages_is_selected ON pages(user_id, is_selected);

-- Instagram accounts table: stores Instagram Business accounts linked to pages
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  instagram_id VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_page_id ON instagram_accounts(page_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_instagram_id ON instagram_accounts(instagram_id);

-- Webhook subscriptions table: stores webhook field subscriptions per page
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  field VARCHAR(100) NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, field)
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_page_id ON webhook_subscriptions(page_id);

-- Webhook events table: stores incoming webhook deliveries for audit/replay
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  event_type VARCHAR(100),
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_page_id ON webhook_events(page_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);

-- Token refresh log table: tracks token refresh attempts and outcomes
CREATE TABLE IF NOT EXISTS token_refresh_log (
  id SERIAL PRIMARY KEY,
  meta_account_id INTEGER REFERENCES meta_accounts(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  refresh_type VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  old_expires_at TIMESTAMP WITH TIME ZONE,
  new_expires_at TIMESTAMP WITH TIME ZONE,
  refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_refresh_log_meta_account_id ON token_refresh_log(meta_account_id);
CREATE INDEX IF NOT EXISTS idx_token_refresh_log_page_id ON token_refresh_log(page_id);
CREATE INDEX IF NOT EXISTS idx_token_refresh_log_refreshed_at ON token_refresh_log(refreshed_at DESC);

-- Sessions table: stores user sessions (if not using express-session with connect-pg-simple)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meta_accounts_updated_at ON meta_accounts;
CREATE TRIGGER update_meta_accounts_updated_at
  BEFORE UPDATE ON meta_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Message processing queue table: tracks N8N message processing workflow
CREATE TABLE IF NOT EXISTS message_processing_queue (
  id SERIAL PRIMARY KEY,
  webhook_event_id INTEGER REFERENCES webhook_events(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
  instagram_id VARCHAR(255),
  sender_id VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(255) NOT NULL,
  message_text TEXT,
  message_id VARCHAR(255),
  n8n_workflow_id VARCHAR(255),
  n8n_execution_id VARCHAR(255),
  ai_response TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  sent_to_n8n_at TIMESTAMP WITH TIME ZONE,
  received_from_n8n_at TIMESTAMP WITH TIME ZONE,
  sent_to_instagram_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_queue_webhook_event_id ON message_processing_queue(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_page_id ON message_processing_queue(page_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_sender_id ON message_processing_queue(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_next_retry_at ON message_processing_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_created_at ON message_processing_queue(created_at DESC);

-- Trigger to auto-update updated_at for message_processing_queue
DROP TRIGGER IF EXISTS update_message_queue_updated_at ON message_processing_queue;
CREATE TRIGGER update_message_queue_updated_at
  BEFORE UPDATE ON message_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

