-- Schema do Mural de Atividades e Grupos da Escola
-- Nao guardar idade, telefone, endereco, foto ou texto livre de interesse.
-- Nao existe tabela de mensagens (decisao de projeto: sem mensagem privada).

CREATE DATABASE IF NOT EXISTS mural_atividades CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mural_atividades;

CREATE TABLE IF NOT EXISTS usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email_institucional VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  papel ENUM('aluno','responsavel') NOT NULL,
  turma VARCHAR(50)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interesse_usuario (
  usuario_id INT NOT NULL,
  categoria_id INT NOT NULL,
  PRIMARY KEY (usuario_id, categoria_id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS atividade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  categoria_id INT NOT NULL,
  local VARCHAR(150),
  horario VARCHAR(100),
  vagas INT NOT NULL DEFAULT 0,
  responsavel_id INT NOT NULL,
  status ENUM('ativa','inativa') NOT NULL DEFAULT 'ativa',
  FOREIGN KEY (categoria_id) REFERENCES categoria(id),
  FOREIGN KEY (responsavel_id) REFERENCES usuario(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inscricao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  atividade_id INT NOT NULL,
  usuario_id INT NOT NULL,
  status ENUM('confirmada','espera') NOT NULL,
  posicao_espera INT,
  criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_atividade_usuario (atividade_id, usuario_id),
  FOREIGN KEY (atividade_id) REFERENCES atividade(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lista fechada de categorias/interesses (evita texto livre no perfil do aluno)
INSERT IGNORE INTO categoria (nome) VALUES
('Xadrez'),('RPG'),('Robótica'),('Leitura e mangá'),('Música e banda'),
('Esportes'),('Voleibol'),('Desenho e artes visuais'),
('Ciências e astronomia'),('Programação'),('Teatro'),('Debate e redação');

