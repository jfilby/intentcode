-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "batch_job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" TEXT,
    "user_profile_id" TEXT,
    "run_in_a_transaction" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "progress_pct" INTEGER,
    "message" TEXT,
    "job_type" TEXT NOT NULL,
    "ref_model" TEXT,
    "ref_id" TEXT,
    "parameters" TEXT,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "batch_job_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batch_job_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "waitlist" (
    "email" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "version" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "source_edge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "source_edge_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "source_node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "source_edge_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "source_node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_node" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parent_id" TEXT,
    "instance_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "content_hash" TEXT,
    "json_content" JSONB,
    "json_content_hash" TEXT,
    "content_updated" DATETIME,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "source_node_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "source_node" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "source_node_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_node_generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_node_id" TEXT NOT NULL,
    "tech_id" TEXT NOT NULL,
    "temperature" REAL,
    "prompt" TEXT NOT NULL,
    "prompt_hash" TEXT NOT NULL,
    "content" TEXT,
    "content_hash" TEXT,
    "json_content" JSONB,
    "json_content_hash" TEXT,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "source_node_generation_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "source_node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "source_node_generation_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "tech" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_task_tech" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ai_task_id" TEXT NOT NULL,
    "tech_id" TEXT NOT NULL,
    "user_profile_id" TEXT,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "ai_task_tech_ai_task_id_fkey" FOREIGN KEY ("ai_task_id") REFERENCES "ai_task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_task_tech_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "tech" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_task_tech_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "llm_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tech_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "input_message" TEXT NOT NULL,
    "output_message" TEXT,
    "output_messages" JSONB,
    "output_json" JSONB,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "llm_cache_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "tech" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "external_user_integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "external_integration_user_id" TEXT NOT NULL,
    "external_integration" TEXT NOT NULL,
    CONSTRAINT "external_user_integration_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_user_profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "user_group_owner_user_profile_id_fkey" FOREIGN KEY ("owner_user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_group_member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_group_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "is_group_admin" BOOLEAN NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_group_member_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_group_member_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "values" JSONB,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preference_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "is_admin" BOOLEAN NOT NULL,
    "owner_type" TEXT,
    "roles" JSONB,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    "delete_pending" DATETIME,
    CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "unique_ref_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "max_prev_messages" INTEGER,
    "default_prompt" TEXT,
    CONSTRAINT "agent_user_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chat_session_id" TEXT,
    "reply_to_id" TEXT,
    "from_chat_participant_id" TEXT NOT NULL,
    "to_chat_participant_id" TEXT,
    "external_id" TEXT,
    "sent_by_ai" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "chat_message_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_message_from_chat_participant_id_fkey" FOREIGN KEY ("from_chat_participant_id") REFERENCES "chat_participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_message_to_chat_participant_id_fkey" FOREIGN KEY ("to_chat_participant_id") REFERENCES "chat_participant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_message_created" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "instance_id" TEXT,
    "tech_id" TEXT NOT NULL,
    "sent_by_ai" BOOLEAN NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_in_cents" INTEGER NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_message_created_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_message_created_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_message_created_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "tech" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chat_session_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    CONSTRAINT "chat_participant_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_participant_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chat_settings_id" TEXT NOT NULL,
    "instance_id" TEXT,
    "status" TEXT NOT NULL,
    "is_encrypted_at_rest" BOOLEAN NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "external_integration" TEXT,
    "external_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "chat_session_chat_settings_id_fkey" FOREIGN KEY ("chat_settings_id") REFERENCES "chat_settings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_session_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_session_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "base_chat_settings_id" TEXT,
    "status" TEXT NOT NULL,
    "is_encrypted_at_rest" BOOLEAN NOT NULL,
    "is_json_mode" BOOLEAN NOT NULL,
    "is_pinned" BOOLEAN NOT NULL,
    "name" TEXT,
    "agent_user_id" TEXT NOT NULL,
    "prompt" TEXT,
    "agent_role" TEXT,
    "app_custom" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "chat_settings_base_chat_settings_id_fkey" FOREIGN KEY ("base_chat_settings_id") REFERENCES "chat_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chat_settings_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "agent_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chat_settings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feature_flag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT,
    "instance_id" TEXT,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    CONSTRAINT "feature_flag_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "feature_flag_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "instance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parent_id" TEXT,
    "user_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    "instance_type" TEXT NOT NULL,
    "project_type" TEXT,
    "is_default" BOOLEAN NOT NULL,
    "is_demo" BOOLEAN NOT NULL,
    "public_access" TEXT,
    CONSTRAINT "instance_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "instance_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "instance_setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "instance_setting_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limited_api" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tech_id" TEXT,
    "rate_per_minute" INTEGER NOT NULL,
    CONSTRAINT "rate_limited_api_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "tech" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limited_api_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "api_rate_limited_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rate_limited_api_event_api_rate_limited_id_fkey" FOREIGN KEY ("api_rate_limited_id") REFERENCES "rate_limited_api" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rate_limited_api_event_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_quota_total" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "from_day" DATETIME NOT NULL,
    "to_day" DATETIME NOT NULL,
    "quota" REAL NOT NULL,
    CONSTRAINT "resource_quota_total_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_quota_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "day" DATETIME NOT NULL,
    "usage" REAL NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "resource_quota_usage_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tech" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tech_provider_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "model" TEXT,
    "protocol" TEXT,
    "pricing_tier" TEXT NOT NULL,
    "is_default_provider" BOOLEAN NOT NULL,
    "is_admin_only" BOOLEAN NOT NULL,
    CONSTRAINT "tech_tech_provider_id_fkey" FOREIGN KEY ("tech_provider_id") REFERENCES "tech_provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tech_provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT,
    "provides" JSONB
);

-- CreateTable
CREATE TABLE "tech_provider_api_key" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tech_provider_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_email" TEXT,
    "api_key" TEXT NOT NULL,
    "pricing_tier" TEXT,
    CONSTRAINT "tech_provider_api_key_tech_provider_id_fkey" FOREIGN KEY ("tech_provider_id") REFERENCES "tech_provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mailing_list" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mailing_list_subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mailing_list_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "verification_code" TEXT,
    "verified" DATETIME,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "mailing_list_subscriber_mailing_list_id_fkey" FOREIGN KEY ("mailing_list_id") REFERENCES "mailing_list" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tags" JSONB
);

-- CreateTable
CREATE TABLE "tip_got_it" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tip_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    CONSTRAINT "tip_got_it_tip_id_fkey" FOREIGN KEY ("tip_id") REFERENCES "tip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tip_got_it_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_error" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_error_summary_id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "end_user_profile_id" TEXT,
    "instance_id" TEXT,
    "origin" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tech_message" TEXT,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "user_error_user_error_summary_id_fkey" FOREIGN KEY ("user_error_summary_id") REFERENCES "user_error_summary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_error_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_error_end_user_profile_id_fkey" FOREIGN KEY ("end_user_profile_id") REFERENCES "user_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "user_error_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_error_summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT NOT NULL,
    "instance_id" TEXT,
    "origin" TEXT,
    "message" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "user_error_summary_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_error_summary_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "batch_job_ref_id_idx" ON "batch_job"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "version_name_key" ON "version"("name");

-- CreateIndex
CREATE UNIQUE INDEX "source_edge_from_id_to_id_name_key" ON "source_edge"("from_id", "to_id", "name");

-- CreateIndex
CREATE INDEX "source_node_content_hash_idx" ON "source_node"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_node_parent_id_instance_id_type_name_key" ON "source_node"("parent_id", "instance_id", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "source_node_generation_source_node_id_tech_id_prompt_hash_key" ON "source_node_generation"("source_node_id", "tech_id", "prompt_hash");

-- CreateIndex
CREATE UNIQUE INDEX "ai_task_namespace_name_key" ON "ai_task"("namespace", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_task_tech_ai_task_id_user_profile_id_key" ON "ai_task_tech"("ai_task_id", "user_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "llm_cache_key_tech_id_key" ON "llm_cache"("key", "tech_id");

-- CreateIndex
CREATE INDEX "external_user_integration_user_profile_id_idx" ON "external_user_integration"("user_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_user_integration_external_integration_user_id_external_integration_key" ON "external_user_integration"("external_integration_user_id", "external_integration");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_name_key" ON "user_group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_owner_user_profile_id_name_key" ON "user_group"("owner_user_profile_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_member_user_profile_id_user_group_id_key" ON "user_group_member"("user_profile_id", "user_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_user_profile_id_key_key" ON "user_preference"("user_profile_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_user_user_profile_id_key" ON "agent_user"("user_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_user_unique_ref_id_key" ON "agent_user"("unique_ref_id");

-- CreateIndex
CREATE INDEX "chat_message_chat_session_id_idx" ON "chat_message"("chat_session_id");

-- CreateIndex
CREATE INDEX "chat_message_created_idx" ON "chat_message"("created");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_chat_session_id_external_id_key" ON "chat_message"("chat_session_id", "external_id");

-- CreateIndex
CREATE INDEX "chat_message_created_created_idx" ON "chat_message_created"("created");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_created_user_profile_id_created_key" ON "chat_message_created"("user_profile_id", "created");

-- CreateIndex
CREATE INDEX "chat_participant_chat_session_id_idx" ON "chat_participant"("chat_session_id");

-- CreateIndex
CREATE INDEX "chat_session_created_idx" ON "chat_session"("created");

-- CreateIndex
CREATE INDEX "chat_session_external_id_idx" ON "chat_session"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_settings_name_key" ON "chat_settings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "instance_user_profile_id_parent_id_name_key" ON "instance"("user_profile_id", "parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "instance_setting_instance_id_name_key" ON "instance_setting"("instance_id", "name");

-- CreateIndex
CREATE INDEX "rate_limited_api_event_created_idx" ON "rate_limited_api_event"("created");

-- CreateIndex
CREATE UNIQUE INDEX "resource_quota_total_user_profile_id_resource_from_day_to_day_key" ON "resource_quota_total"("user_profile_id", "resource", "from_day", "to_day");

-- CreateIndex
CREATE UNIQUE INDEX "resource_quota_usage_user_profile_id_resource_day_key" ON "resource_quota_usage"("user_profile_id", "resource", "day");

-- CreateIndex
CREATE UNIQUE INDEX "tech_variant_name_key" ON "tech"("variant_name");

-- CreateIndex
CREATE UNIQUE INDEX "tech_provider_name_key" ON "tech_provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tech_provider_api_key_tech_provider_id_name_key" ON "tech_provider_api_key"("tech_provider_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tech_provider_api_key_tech_provider_id_api_key_key" ON "tech_provider_api_key"("tech_provider_id", "api_key");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_name_key" ON "mailing_list"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_title_key" ON "mailing_list"("title");

-- CreateIndex
CREATE UNIQUE INDEX "mailing_list_subscriber_mailing_list_id_email_key" ON "mailing_list_subscriber"("mailing_list_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "tip_name_key" ON "tip"("name");

-- CreateIndex
CREATE INDEX "tip_tags_idx" ON "tip"("tags");

-- CreateIndex
CREATE INDEX "tip_got_it_user_profile_id_idx" ON "tip_got_it"("user_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "tip_got_it_tip_id_user_profile_id_key" ON "tip_got_it"("tip_id", "user_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_error_summary_user_profile_id_instance_id_origin_message_key" ON "user_error_summary"("user_profile_id", "instance_id", "origin", "message");
