-- Schema do Mural de Atividades e Grupos da Escola
-- Espelha exatamente as decisoes de docs/BANCO_DE_DADOS.md
-- Nao guardar idade, telefone, endereco, foto ou texto livre de interesse.

CREATE TABLE IF NOT EXISTS usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email_institucional TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('aluno', 'responsavel')),
  turma TEXT
);

CREATE TABLE IF NOT EXISTS categoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS interesse_usuario (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, categoria_id)
);

CREATE TABLE IF NOT EXISTS atividade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  local TEXT,
  horario TEXT,
  vagas INTEGER NOT NULL DEFAULT 0,
  responsavel_id INTEGER NOT NULL REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS inscricao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atividade_id INTEGER NOT NULL REFERENCES atividade(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmada', 'espera')),
  posicao_espera INTEGER,
  UNIQUE (atividade_id, usuario_id))