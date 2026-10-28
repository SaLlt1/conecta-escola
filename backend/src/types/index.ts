import type { RowDataPacket } from "mysql2";

export type Papel = "aluno" | "responsavel";
export type StatusAtividade = "ativa" | "inativa";
export type StatusInscricao = "confirmada" | "espera";

// O que vai dentro do JWT (e fica em req.usuario)
export interface UsuarioToken {
  id: number;
  papel: Papel;
  nome: string;
}

// Tabelas do banco (schema.sql)
export interface Usuario {
  id: number;
  nome: string;
  email_institucional: string;
  senha_hash: string;
  papel: Papel;
  turma: string | null;
}

export interface Categoria {
  id: number;
  nome: string;
}

export interface Atividade {
  id: number;
  nome: string;
  descricao: string | null;
  categoria_id: number;
  local: string | null;
  horario: string | null;
  vagas: number;
  responsavel_id: number;
  status: StatusAtividade;
}

export interface Inscricao {
  id: number;
  atividade_id: number;
  usuario_id: number;
  status: StatusInscricao;
  posicao_espera: number | null;
  criada_em: Date;
}

// Resultado de um SELECT no mysql2: o tipo da tabela + RowDataPacket
export type Linha<T> = T & RowDataPacket;