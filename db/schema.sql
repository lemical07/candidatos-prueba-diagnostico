CREATE DATABASE IF NOT EXISTS recruitment CHARACTER SET utf8mb4;
USE recruitment;

CREATE TABLE candidates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  years_experience TINYINT UNSIGNED NOT NULL
);

CREATE TABLE vacancies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  min_years_experience TINYINT UNSIGNED NOT NULL,
  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,
  vacancy_id INT UNSIGNED NOT NULL,
  cover_letter TEXT NOT NULL,
  source ENUM('REFERRAL','INTERNAL','JOB_BOARD','OTHER') NOT NULL,
  score TINYINT NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','TOP') NOT NULL,
  status ENUM('RECEIVED','IN_REVIEW','REJECTED','HIRED') NOT NULL DEFAULT 'RECEIVED',
  created_at DATETIME NOT NULL,
  status_updated_at DATETIME NOT NULL,
  CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  CONSTRAINT fk_app_vacancy FOREIGN KEY (vacancy_id) REFERENCES vacancies(id),
  INDEX idx_dup (candidate_id, vacancy_id, status),
  INDEX idx_list (status, vacancy_id)
);

-- Datos de prueba
INSERT INTO candidates (name, email, years_experience) VALUES
  ('Ana Pérez', 'ana@mail.com', 5),
  ('Luis Gómez', 'luis@mail.com', 1);

INSERT INTO vacancies (title, min_years_experience, status) VALUES
  ('Backend Developer', 3, 'OPEN'),
  ('Data Analyst', 2, 'OPEN'),
  ('QA Engineer', 1, 'OPEN'),
  ('DevOps Engineer', 4, 'OPEN'),
  ('UX Designer', 2, 'CLOSED');