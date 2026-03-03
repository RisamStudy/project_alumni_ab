-- Migration: 001_init.sql
-- Alumni Al Bahjah Database Schema (MySQL)

CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    full_name   VARCHAR(255) NOT NULL,
    birth_year  SMALLINT     NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    status      ENUM('unverified', 'active', 'suspended') NOT NULL DEFAULT 'unverified',
    role        ENUM('alumni', 'admin') NOT NULL DEFAULT 'alumni',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    photo_url       TEXT,
    phone           VARCHAR(20),
    graduation_year SMALLINT,
    major           VARCHAR(100),
    city            VARCHAR(100),
    job_title       VARCHAR(100),
    company         VARCHAR(100),
    bio             TEXT,
    linkedin_url    TEXT,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verifications (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id     VARCHAR(36)  NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id     VARCHAR(36)  NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME     NOT NULL,
    used        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id     VARCHAR(36)  NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME     NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS news (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    content     LONGTEXT     NOT NULL,
    thumbnail   TEXT,
    category    VARCHAR(100),
    author_id   VARCHAR(36),
    published   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    location    VARCHAR(255),
    event_type  ENUM('offline', 'online') NOT NULL DEFAULT 'offline',
    zoom_link   TEXT,
    start_time  DATETIME     NOT NULL,
    end_time    DATETIME,
    thumbnail   TEXT,
    author_id   VARCHAR(36),
    published   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    event_id    VARCHAR(36)  NOT NULL,
    user_id     VARCHAR(36)  NOT NULL,
    status      ENUM('interested', 'registered') NOT NULL DEFAULT 'registered',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_event_user (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
    id              VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    title           VARCHAR(255) NOT NULL,
    company         VARCHAR(255) NOT NULL,
    location        VARCHAR(255),
    job_type        ENUM('full_time', 'part_time', 'remote', 'contract') NOT NULL DEFAULT 'full_time',
    description     LONGTEXT,
    apply_url       TEXT,
    posted_by       VARCHAR(36),
    expires_at      DATETIME,
    published       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS surveys (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    form_url    TEXT         NOT NULL,
    author_id   VARCHAR(36),
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
