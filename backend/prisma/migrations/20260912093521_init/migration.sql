-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_plans` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration_type` ENUM('MONTH_1', 'MONTH_3', 'CUSTOM') NOT NULL,
    `duration_days` INTEGER UNSIGNED NOT NULL,
    `description` VARCHAR(500) NULL,
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `member_plans_enabled_sort_idx`(`enabled`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_memberships` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `expire_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_memberships_user_id_key`(`user_id`),
    INDEX `user_memberships_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(64) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `plan_id` BIGINT UNSIGNED NOT NULL,
    `plan_name` VARCHAR(64) NOT NULL,
    `duration_days` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('CREATED', 'PENDING', 'PAID', 'CLOSED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    `payment_config_id` BIGINT UNSIGNED NULL,
    `transaction_no` VARCHAR(128) NULL,
    `paid_at` DATETIME(3) NULL,
    `expire_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_no_key`(`order_no`),
    INDEX `orders_user_id_status_idx`(`user_id`, `status`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_configs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `provider` VARCHAR(32) NOT NULL,
    `merchant_id` VARCHAR(128) NULL,
    `app_id` VARCHAR(128) NULL,
    `app_secret` VARCHAR(255) NULL,
    `api_key` VARCHAR(255) NULL,
    `gateway_url` VARCHAR(255) NULL,
    `notify_url` VARCHAR(255) NULL,
    `return_url` VARCHAR(255) NULL,
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_configs_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_configs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `provider` ENUM('OPENAI_COMPATIBLE', 'CUSTOM') NOT NULL DEFAULT 'OPENAI_COMPATIBLE',
    `base_url` VARCHAR(255) NOT NULL,
    `api_key` VARCHAR(255) NULL,
    `model_name` VARCHAR(128) NOT NULL,
    `max_tokens` INTEGER UNSIGNED NOT NULL DEFAULT 2048,
    `temperature` DECIMAL(3, 2) NOT NULL DEFAULT 0.70,
    `enabled` TINYINT NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `model_configs_enabled_sort_idx`(`enabled`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `model_config_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL DEFAULT '新对话',
    `last_message_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conversations_user_id_last_message_at_idx`(`user_id`, `last_message_at` DESC),
    INDEX `conversations_user_id_deleted_at_idx`(`user_id`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('SYSTEM', 'USER', 'ASSISTANT') NOT NULL,
    `content` TEXT NOT NULL,
    `model_name` VARCHAR(128) NULL,
    `token_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `ip` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,
    `result` ENUM('SUCCESS', 'FAILED') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(64) NOT NULL,
    `config_value` TEXT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_config_key_key`(`config_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_memberships` ADD CONSTRAINT `user_memberships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `member_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_payment_config_id_fkey` FOREIGN KEY (`payment_config_id`) REFERENCES `payment_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_model_config_id_fkey` FOREIGN KEY (`model_config_id`) REFERENCES `model_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
