-- 001: link staff to their Clerk account. Additive and idempotent. Old auth columns are untouched.
ALTER TABLE ego_users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ego_users_clerk_user_id ON ego_users (clerk_user_id);
