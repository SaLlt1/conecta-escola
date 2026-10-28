import db from "../db/connection";
import type { Linha } from "../types";

export const MINIMO_PARA_EXIBIR = 5;

interface LinhaAgregada {
  categoria_id: number;
  categoria_nome: string;
  total_interessados: number;
  total_atividades: number;
}

export interface InteresseAgregado {
  categoria_id: number;
  categoria: string;
  total_interessados: number;
  total_atividades: number;
  sem_atividade_correspondente: boolean;
}

export async function interessesAgregados(): Promise<InteresseAgregado[]> {
  const [linhas] = await db.query<Linha<LinhaAgregada>[]>(
    `SELECT
       categoria.id AS categoria_id,
       categoria.nome AS categoria_nome,
       COUNT(DISTINCT interesse_usuario.usuario_id) AS total_interessados,
       COUNT(DISTINCT CASE WHEN atividade.status = 'ativa' THEN atividade.id END) AS total_atividades
     FROM categoria
     LEFT JOIN interesse_usuario ON interesse_usuario.categoria_id = categoria.id
     LEFT JOIN atividade ON atividade.categoria_id = categoria.id
     GROUP BY categoria.id
     ORDER BY total_interessados DESC`
  );

  return linhas
    .filter((linha) => linha.total_interessados >= MINIMO_PARA_EXIBIR)
    .map((linha) => ({
      categoria_id: linha.categoria_id,
      categoria: linha.categoria_nome,
      total_interessados: linha.total_interessados,
      total_atividades: linha.total_atividades,
      sem_atividade_correspondente: linha.total_atividades === 0,
    }));
}