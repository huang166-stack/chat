-- AlterTable
ALTER TABLE `member_plans` ADD COLUMN `max_contract_pages` INTEGER UNSIGNED NOT NULL DEFAULT 30,
    ADD COLUMN `max_file_size_mb` INTEGER UNSIGNED NOT NULL DEFAULT 20,
    ADD COLUMN `review_quota` INTEGER UNSIGNED NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE `contract_projects` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `team_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(128) NOT NULL,
    `contract_type` ENUM('SALES', 'PURCHASE', 'NDA', 'EMPLOYMENT', 'LEASE', 'SERVICE', 'OTHER') NOT NULL,
    `counterparty` VARCHAR(128) NULL,
    `stance` VARCHAR(16) NOT NULL DEFAULT 'NEUTRAL',
    `status` ENUM('PARSING', 'READY', 'REVIEWING', 'COMPLETED', 'FAILED', 'ARCHIVED') NOT NULL DEFAULT 'PARSING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `contract_projects_user_id_updated_at_idx`(`user_id`, `updated_at`),
    INDEX `contract_projects_user_id_deleted_at_idx`(`user_id`, `deleted_at`),
    INDEX `contract_projects_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT UNSIGNED NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(64) NOT NULL,
    `size` INTEGER UNSIGNED NOT NULL,
    `page_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `sha256` VARCHAR(64) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `parse_status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `parsed_text` LONGTEXT NULL,
    `parse_error` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contract_documents_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `contract_documents_sha256_idx`(`sha256`),
    INDEX `contract_documents_parse_status_idx`(`parse_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_clauses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT UNSIGNED NOT NULL,
    `order_no` INTEGER UNSIGNED NOT NULL,
    `clause_type` VARCHAR(32) NULL,
    `heading` VARCHAR(255) NULL,
    `content` TEXT NOT NULL,
    `page_start` INTEGER UNSIGNED NULL,
    `page_end` INTEGER UNSIGNED NULL,
    `char_start` INTEGER UNSIGNED NOT NULL,
    `char_end` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contract_clauses_document_id_order_no_idx`(`document_id`, `order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_rules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `category` VARCHAR(32) NOT NULL,
    `severity` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL,
    `rule_type` ENUM('PRESENCE', 'REGEX', 'KEYWORD', 'THRESHOLD', 'LLM') NOT NULL,
    `description` VARCHAR(500) NULL,
    `config_json` JSON NULL,
    `prompt` TEXT NULL,
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `review_rules_category_enabled_idx`(`category`, `enabled`),
    UNIQUE INDEX `review_rules_code_version_key`(`code`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_rule_sets` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(500) NULL,
    `contract_type` ENUM('SALES', 'PURCHASE', 'NDA', 'EMPLOYMENT', 'LEASE', 'SERVICE', 'OTHER') NULL,
    `stance` VARCHAR(16) NOT NULL DEFAULT 'NEUTRAL',
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `review_rule_sets_contract_type_enabled_idx`(`contract_type`, `enabled`),
    UNIQUE INDEX `review_rule_sets_name_version_key`(`name`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_rule_set_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rule_set_id` BIGINT UNSIGNED NOT NULL,
    `rule_id` BIGINT UNSIGNED NOT NULL,
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `severity` ENUM('HIGH', 'MEDIUM', 'LOW') NULL,
    `config_override` JSON NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `review_rule_set_items_rule_set_id_sort_idx`(`rule_set_id`, `sort`),
    UNIQUE INDEX `review_rule_set_items_rule_set_id_rule_id_key`(`rule_set_id`, `rule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_tasks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT UNSIGNED NOT NULL,
    `rule_set_id` BIGINT UNSIGNED NULL,
    `model_config_id` BIGINT UNSIGNED NULL,
    `rule_set_version` INTEGER NULL,
    `stance` VARCHAR(16) NOT NULL DEFAULT 'NEUTRAL',
    `status` ENUM('PENDING', 'PARSING', 'RULE_CHECK', 'MODEL_REVIEW', 'AGGREGATING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `progress` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `error_message` VARCHAR(500) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `review_tasks_document_id_status_idx`(`document_id`, `status`),
    INDEX `review_tasks_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_findings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `clause_id` BIGINT UNSIGNED NULL,
    `source` ENUM('RULE', 'MODEL') NOT NULL DEFAULT 'MODEL',
    `rule_code` VARCHAR(64) NULL,
    `category` VARCHAR(64) NOT NULL,
    `risk_level` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `analysis` TEXT NOT NULL,
    `suggestion` TEXT NULL,
    `legal_basis` TEXT NULL,
    `evidence` TEXT NULL,
    `confidence` DECIMAL(4, 3) NULL,
    `status` ENUM('OPEN', 'ACCEPTED', 'IGNORED', 'NEEDS_REVIEW') NOT NULL DEFAULT 'OPEN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `review_findings_task_id_risk_level_idx`(`task_id`, `risk_level`),
    INDEX `review_findings_task_id_status_idx`(`task_id`, `status`),
    INDEX `review_findings_clause_id_idx`(`clause_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_reports` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `format` ENUM('DOCX', 'PDF') NOT NULL DEFAULT 'DOCX',
    `storage_key` VARCHAR(255) NOT NULL,
    `summary_json` JSON NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error_message` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `review_reports_task_id_key`(`task_id`),
    INDEX `review_reports_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_ledger` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `task_id` BIGINT UNSIGNED NULL,
    `kind` ENUM('REVIEW', 'MODEL_CALL', 'REPORT', 'ADJUSTMENT') NOT NULL,
    `tokens_in` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `tokens_out` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `credits` INTEGER NOT NULL DEFAULT 0,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usage_ledger_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `usage_ledger_task_id_idx`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_feedbacks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `finding_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `action` ENUM('ACCEPT', 'IGNORE', 'CORRECT') NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `review_feedbacks_finding_id_created_at_idx`(`finding_id`, `created_at`),
    INDEX `review_feedbacks_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `source` VARCHAR(128) NOT NULL,
    `jurisdiction` VARCHAR(64) NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `knowledge_documents_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contract_projects` ADD CONSTRAINT `contract_projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_documents` ADD CONSTRAINT `contract_documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `contract_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_clauses` ADD CONSTRAINT `contract_clauses_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `contract_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_rule_set_items` ADD CONSTRAINT `review_rule_set_items_rule_set_id_fkey` FOREIGN KEY (`rule_set_id`) REFERENCES `review_rule_sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_rule_set_items` ADD CONSTRAINT `review_rule_set_items_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `review_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `contract_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_rule_set_id_fkey` FOREIGN KEY (`rule_set_id`) REFERENCES `review_rule_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_tasks` ADD CONSTRAINT `review_tasks_model_config_id_fkey` FOREIGN KEY (`model_config_id`) REFERENCES `model_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_findings` ADD CONSTRAINT `review_findings_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `review_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_findings` ADD CONSTRAINT `review_findings_clause_id_fkey` FOREIGN KEY (`clause_id`) REFERENCES `contract_clauses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_reports` ADD CONSTRAINT `review_reports_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `review_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_ledger` ADD CONSTRAINT `usage_ledger_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_ledger` ADD CONSTRAINT `usage_ledger_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `review_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_feedbacks` ADD CONSTRAINT `review_feedbacks_finding_id_fkey` FOREIGN KEY (`finding_id`) REFERENCES `review_findings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_feedbacks` ADD CONSTRAINT `review_feedbacks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
