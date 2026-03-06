-- ============================================
-- DeepSeek Chat Application - MySQL Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS deepseek_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE deepseek_chat;

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(7) DEFAULT '#6366f1',
    avatar_initials VARCHAR(3),
    role ENUM('user', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    preferred_model VARCHAR(100) DEFAULT 'deepseek-chat',
    preferred_max_tokens INT DEFAULT 2048,
    preferred_temperature DECIMAL(3,2) DEFAULT 0.70,
    preferred_language VARCHAR(10) DEFAULT 'fr',
    total_messages_sent INT DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    last_active_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================
-- CONVERSATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) DEFAULT 'Nouvelle conversation',
    model VARCHAR(100) DEFAULT 'deepseek-chat',
    system_prompt TEXT,
    max_tokens INT DEFAULT 2048,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    top_p DECIMAL(3,2) DEFAULT 1.00,
    presence_penalty DECIMAL(3,2) DEFAULT 0.00,
    frequency_penalty DECIMAL(3,2) DEFAULT 0.00,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(100) UNIQUE,
    total_messages INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    tags JSON,
    folder_id VARCHAR(36),
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_archived (is_archived),
    INDEX idx_is_pinned (is_pinned)
);

-- =====================
-- MESSAGES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conversation_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content LONGTEXT NOT NULL,
    reasoning_content LONGTEXT,
    model VARCHAR(100),
    tokens_used INT DEFAULT 0,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    original_content LONGTEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    reaction VARCHAR(20),
    generation_time_ms INT,
    finish_reason VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_role (role),
    INDEX idx_is_bookmarked (is_bookmarked)
);

-- =====================
-- FOLDERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'folder',
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- PROMPTS LIBRARY TABLE (Saved system prompts / templates)
-- =====================
CREATE TABLE IF NOT EXISTS prompt_templates (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_public (is_public)
);

-- =====================
-- USER STATS (Cached analytics)
-- =====================
CREATE TABLE IF NOT EXISTS user_stats (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    conversations_today INT DEFAULT 0,
    messages_today INT DEFAULT 0,
    tokens_today BIGINT DEFAULT 0,
    conversations_this_week INT DEFAULT 0,
    messages_this_week INT DEFAULT 0,
    tokens_this_week BIGINT DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- SEED: Default Prompt Templates
-- =====================
INSERT INTO prompt_templates (id, title, description, content, category, is_public, tags) VALUES
(UUID(), 'Assistant Général', 'Un assistant polyvalent et helpful', 'Tu es un assistant IA intelligent et serviable. Tu réponds de manière claire, concise et précise. Tu adaptes ton ton et style selon le contexte.', 'Général', TRUE, '["assistant", "général"]'),
(UUID(), 'Expert Code', 'Spécialiste en développement logiciel', 'Tu es un expert développeur senior full-stack avec 15 ans d expérience. Tu maîtrises tous les langages et frameworks modernes. Tu fournis du code propre, optimisé et bien commenté. Tu expliques toujours tes choix techniques.', 'Technique', TRUE, '["code", "développement", "technique"]'),
(UUID(), 'Correcteur Rédactionnel', 'Correction et amélioration de textes', 'Tu es un expert linguiste et correcteur professionnel. Tu corriges la grammaire, l orthographe, le style et améliores la clarté des textes. Tu fournis des explications pour chaque correction importante.', 'Écriture', TRUE, '["correction", "rédaction", "français"]'),
(UUID(), 'Analyste Business', 'Analyse stratégique et business', 'Tu es un consultant business senior avec expertise en stratégie, finance et marketing. Tu analyses les situations avec rigueur, fournis des insights actionnables et des recommandations basées sur des données.', 'Business', TRUE, '["business", "stratégie", "analyse"]'),
(UUID(), 'Professeur Pédagogue', 'Enseignement adaptatif et clair', 'Tu es un professeur expérimenté qui sait adapter ses explications au niveau de l élève. Tu utilises des analogies, des exemples concrets et tu vérifies la compréhension. Tu encourages les questions.', 'Éducation', TRUE, '["enseignement", "pédagogie", "apprentissage"]');
