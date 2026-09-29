-- DropIndex
DROP INDEX "ai_task_namespace_name_key";

-- DropIndex
DROP INDEX "ai_task_tech_ai_task_id_user_profile_id_key";

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN "public_id" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ai_task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ai_task_tech";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agent_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_profile_id" TEXT,
    "unique_ref_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "max_prev_messages" INTEGER,
    "default_prompt" TEXT,
    CONSTRAINT "agent_user_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_agent_user" ("default_prompt", "id", "max_prev_messages", "name", "role", "unique_ref_id", "user_profile_id") SELECT "default_prompt", "id", "max_prev_messages", "name", "role", "unique_ref_id", "user_profile_id" FROM "agent_user";
DROP TABLE "agent_user";
ALTER TABLE "new_agent_user" RENAME TO "agent_user";
CREATE UNIQUE INDEX "agent_user_unique_ref_id_key" ON "agent_user"("unique_ref_id");
CREATE TABLE "new_instance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "public_id" TEXT,
    "parent_id" TEXT,
    "user_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
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
INSERT INTO "new_instance" ("created", "id", "instance_type", "is_default", "is_demo", "name", "parent_id", "project_type", "public_access", "status", "updated", "user_profile_id") SELECT "created", "id", "instance_type", "is_default", "is_demo", "name", "parent_id", "project_type", "public_access", "status", "updated", "user_profile_id" FROM "instance";
DROP TABLE "instance";
ALTER TABLE "new_instance" RENAME TO "instance";
CREATE UNIQUE INDEX "instance_user_profile_id_parent_id_name_key" ON "instance"("user_profile_id", "parent_id", "name");
CREATE TABLE "new_llm_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "input_message" TEXT NOT NULL,
    "output_message" TEXT,
    "output_json" JSONB,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_llm_cache" ("created", "id", "input_message", "key", "output_json", "output_message") SELECT "created", "id", "input_message", "key", "output_json", "output_message" FROM "llm_cache";
DROP TABLE "llm_cache";
ALTER TABLE "new_llm_cache" RENAME TO "llm_cache";
CREATE UNIQUE INDEX "llm_cache_key_model_id_key" ON "llm_cache"("key", "model_id");
CREATE TABLE "new_source_node_generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_node_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "temperature" REAL,
    "prompt" TEXT NOT NULL,
    "prompt_hash" TEXT NOT NULL,
    "content" TEXT,
    "content_hash" TEXT,
    "json_content" JSONB,
    "json_content_hash" TEXT,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL,
    CONSTRAINT "source_node_generation_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "source_node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_source_node_generation" ("content", "content_hash", "created", "id", "json_content", "json_content_hash", "prompt", "prompt_hash", "source_node_id", "temperature", "updated") SELECT "content", "content_hash", "created", "id", "json_content", "json_content_hash", "prompt", "prompt_hash", "source_node_id", "temperature", "updated" FROM "source_node_generation";
DROP TABLE "source_node_generation";
ALTER TABLE "new_source_node_generation" RENAME TO "source_node_generation";
CREATE UNIQUE INDEX "source_node_generation_source_node_id_model_id_prompt_hash_key" ON "source_node_generation"("source_node_id", "model_id", "prompt_hash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
