backend/src/services/agregacao.service.js
// Regra de negócio: agregação de interesses sem identificação individual.
// Nunca retorna nomes — apenas contagens, e só a partir de um mínimo,
// para evitar identificar alguém por eliminação em turma pequena.

const db = require("../db/connection");

const MINIMO_PARA_EXIBIR = 5;

// Retorna, para cada categoria, quantos alunos marcaram interesse nela e
// quantas atividades ativas já existem para essa categoria. Só devolve a
// contagem quando ela atinge o mínimo — nunca a lista de quem marcou.
function interessesAgregados() {
  const linhas = db
    .prepare(
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
    )
    .all();

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

module.exports = { interessesAgregados, MINIMO_PARA_EXIBIR };

