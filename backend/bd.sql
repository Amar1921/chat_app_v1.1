-- ============================================================
-- DeepSeek Chat — Schéma complet pour phpMyAdmin
-- Compatible MySQL 5.7+ et MySQL 8+
-- Instructions : coller dans l'onglet SQL de phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS `deepseek_chat`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `deepseek_chat`;

-- =====================
-- TABLE : users
-- =====================
CREATE TABLE IF NOT EXISTS `users` (
                                       `id`                    VARCHAR(36)      NOT NULL,
    `username`              VARCHAR(50)      NOT NULL,
    `email`                 VARCHAR(255)     NOT NULL,
    `password_hash`         VARCHAR(255)     NOT NULL,
    `avatar_color`          VARCHAR(7)       DEFAULT '#6366f1',
    `avatar_initials`       VARCHAR(3)       DEFAULT NULL,
    `role`                  ENUM('user','admin') DEFAULT 'user',
    `is_active`             TINYINT(1)       DEFAULT 1,
    `preferred_model`       VARCHAR(100)     DEFAULT 'deepseek-chat',
    `preferred_max_tokens`  INT              DEFAULT 2048,
    `preferred_temperature` DECIMAL(3,2)     DEFAULT 0.70,
    `preferred_language`    VARCHAR(10)      DEFAULT 'fr',
    `total_messages_sent`   INT              DEFAULT 0,
    `total_tokens_used`     BIGINT           DEFAULT 0,
    `last_active_at`        TIMESTAMP        NULL DEFAULT NULL,
    `created_at`            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_username` (`username`),
    UNIQUE KEY `uq_email`    (`email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- TABLE : conversations
-- =====================
CREATE TABLE IF NOT EXISTS `conversations` (
                                               `id`                VARCHAR(36)  NOT NULL,
    `user_id`           VARCHAR(36)  NOT NULL,
    `title`             VARCHAR(500) DEFAULT 'Nouvelle conversation',
    `model`             VARCHAR(100) DEFAULT 'deepseek-chat',
    `system_prompt`     TEXT         DEFAULT NULL,
    `max_tokens`        INT          DEFAULT 2048,
    `temperature`       DECIMAL(3,2) DEFAULT 0.70,
    `top_p`             DECIMAL(3,2) DEFAULT 1.00,
    `presence_penalty`  DECIMAL(3,2) DEFAULT 0.00,
    `frequency_penalty` DECIMAL(3,2) DEFAULT 0.00,
    `is_pinned`         TINYINT(1)   DEFAULT 0,
    `is_archived`       TINYINT(1)   DEFAULT 0,
    `is_shared`         TINYINT(1)   DEFAULT 0,
    `share_token`       VARCHAR(100) DEFAULT NULL,
    `total_messages`    INT          DEFAULT 0,
    `total_tokens`      INT          DEFAULT 0,
    `tags`              JSON         DEFAULT NULL,
    `folder_id`         VARCHAR(36)  DEFAULT NULL,
    `last_message_at`   TIMESTAMP    NULL DEFAULT NULL,
    `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_share_token` (`share_token`),
    KEY `idx_user_id`    (`user_id`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_is_archived`(`is_archived`),
    KEY `idx_is_pinned`  (`is_pinned`),
    CONSTRAINT `fk_conv_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- TABLE : messages
-- =====================
CREATE TABLE IF NOT EXISTS `messages` (
                                          `id`                  VARCHAR(36)                      NOT NULL,
    `conversation_id`     VARCHAR(36)                      NOT NULL,
    `user_id`             VARCHAR(36)                      NOT NULL,
    `role`                ENUM('user','assistant','system') NOT NULL,
    `content`             LONGTEXT                         NOT NULL,
    `reasoning_content`   LONGTEXT                         DEFAULT NULL,
    `model`               VARCHAR(100)                     DEFAULT NULL,
    `tokens_used`         INT                              DEFAULT 0,
    `prompt_tokens`       INT                              DEFAULT 0,
    `completion_tokens`   INT                              DEFAULT 0,
    `is_edited`           TINYINT(1)                       DEFAULT 0,
    `original_content`    LONGTEXT                         DEFAULT NULL,
    `is_bookmarked`       TINYINT(1)                       DEFAULT 0,
    `reaction`            VARCHAR(20)                      DEFAULT NULL,
    `generation_time_ms`  INT                              DEFAULT NULL,
    `finish_reason`       VARCHAR(50)                      DEFAULT NULL,
    `created_at`          TIMESTAMP                        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP                        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_conversation_id` (`conversation_id`),
    KEY `idx_created_at`      (`created_at`),
    KEY `idx_role`            (`role`),
    KEY `idx_is_bookmarked`   (`is_bookmarked`),
    CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msg_user` FOREIGN KEY (`user_id`)         REFERENCES `users`(`id`)         ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- TABLE : folders
-- =====================
CREATE TABLE IF NOT EXISTS `folders` (
                                         `id`         VARCHAR(36)  NOT NULL,
    `user_id`    VARCHAR(36)  NOT NULL,
    `name`       VARCHAR(100) NOT NULL,
    `color`      VARCHAR(7)   DEFAULT '#6366f1',
    `icon`       VARCHAR(50)  DEFAULT 'folder',
    `position`   INT          DEFAULT 0,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_folder_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- TABLE : prompt_templates
-- =====================
CREATE TABLE IF NOT EXISTS `prompt_templates` (
                                                  `id`          VARCHAR(36)  NOT NULL,
    `user_id`     VARCHAR(36)  DEFAULT NULL,
    `title`       VARCHAR(200) NOT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `content`     TEXT         NOT NULL,
    `category`    VARCHAR(100) DEFAULT NULL,
    `is_public`   TINYINT(1)   DEFAULT 0,
    `usage_count` INT          DEFAULT 0,
    `tags`        JSON         DEFAULT NULL,
    `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_pt_user_id`   (`user_id`),
    KEY `idx_pt_is_public` (`is_public`),
    CONSTRAINT `fk_pt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- TABLE : user_stats
-- =====================
CREATE TABLE IF NOT EXISTS `user_stats` (
                                            `id`                      VARCHAR(36) NOT NULL,
    `user_id`                 VARCHAR(36) NOT NULL,
    `conversations_today`     INT         DEFAULT 0,
    `messages_today`          INT         DEFAULT 0,
    `tokens_today`            BIGINT      DEFAULT 0,
    `conversations_this_week` INT         DEFAULT 0,
    `messages_this_week`      INT         DEFAULT 0,
    `tokens_this_week`        BIGINT      DEFAULT 0,
    `last_calculated_at`      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_us_user_id` (`user_id`),
    CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- SEED : prompt_templates par défaut
-- =====================
INSERT INTO `prompt_templates` (`id`, `user_id`, `title`, `description`, `content`, `category`, `is_public`, `tags`) VALUES
                                                                                                                         (UUID(), NULL, 'Assistant Général',      'Un assistant polyvalent et helpful',        'Tu es un assistant IA intelligent et serviable. Tu réponds de manière claire, concise et précise. Tu adaptes ton ton et style selon le contexte.',                                                                                                              'Général',   1, '["assistant","général"]'),
                                                                                                                         (UUID(), NULL, 'Expert Code',            'Spécialiste en développement logiciel',     'Tu es un expert développeur senior full-stack avec 15 ans d\'expérience. Tu maîtrises tous les langages et frameworks modernes. Tu fournis du code propre, optimisé et bien commenté. Tu expliques toujours tes choix techniques.',                               'Technique', 1, '["code","développement","technique"]'),
(UUID(), NULL, 'Correcteur Rédactionnel','Correction et amélioration de textes',      'Tu es un expert linguiste et correcteur professionnel. Tu corriges la grammaire, l\'orthographe, le style et améliores la clarté des textes. Tu fournis des explications pour chaque correction importante.',                                                    'Écriture',  1, '["correction","rédaction","français"]'),
                                                                                                                         (UUID(), NULL, 'Analyste Business',      'Analyse stratégique et business',           'Tu es un consultant business senior avec expertise en stratégie, finance et marketing. Tu analyses les situations avec rigueur, fournis des insights actionnables et des recommandations basées sur des données.',                                                   'Business',  1, '["business","stratégie","analyse"]'),
                                                                                                                         (UUID(), NULL, 'Professeur Pédagogue',   'Enseignement adaptatif et clair',           'Tu es un professeur expérimenté qui sait adapter ses explications au niveau de l\'élève. Tu utilises des analogies, des exemples concrets et tu vérifies la compréhension. Tu encourages les questions.',                                                          'Éducation', 1, '["enseignement","pédagogie","apprentissage"]');

-- =====================
-- Vérification finale
-- =====================
SELECT 'Tables créées avec succès ✅' AS statut;
SHOW TABLES;