const db = require("../db/connection");

const MINIMO_PARA_EXIBIR = 5;

async function interessesAgregados() {
  const [linhas] = await db.query(
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

module.exports = { interessesAgregados, MINIMO_PARA_EXIBIR };