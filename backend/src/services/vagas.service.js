const db = require("../db/connection");

async function contarConfirmados(atividadeId) {
  const [[linha]] = await db.query(
    "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'confirmada'",
    [atividadeId]
  );
  return linha.total;
}

async function contarEmEspera(atividadeId) {
  const [[linha]] = await db.query(
    "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'espera'",
    [atividadeId]
  );
  return linha.total;
}

async function inscrever(atividade, usuarioId) {
  const confirmados = await contarConfirmados(atividade.id);
  const temVaga = confirmados < atividade.vagas;

  if (temVaga) {
    const [resultado] = await db.query(
      `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
       VALUES (?, ?, 'confirmada', NULL)`,
      [atividade.id, usuarioId]
    );
    return buscarInscricaoPorId(resultado.insertId);
  }

  const posicao = (await contarEmEspera(atividade.id)) + 1;
  const [resultado] = await db.query(
    `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
     VALUES (?, ?, 'espera', ?)`,
    [atividade.id, usuarioId, posicao]
  );
  return buscarInscricaoPorId(resultado.insertId);
}

async function buscarInscricaoPorId(id) {
  const [[inscricao]] = await db.query("SELECT * FROM inscricao WHERE id = ?", [id]);
  return inscricao;
}

async function cancelar(inscricao) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    await conexao.query("DELETE FROM inscricao WHERE id = ?", [inscricao.id]);

    if (inscricao.status === "confirmada") {
      const [[proximo]] = await conexao.query(
        `SELECT * FROM inscricao
         WHERE atividade_id = ? AND status = 'espera'
         ORDER BY posicao_espera ASC
         LIMIT 1`,
        [inscricao.atividade_id]
      );

      if (proximo) {
        await conexao.query(
          "UPDATE inscricao SET status = 'confirmada', posicao_espera = NULL WHERE id = ?",
          [proximo.id]
        );

        const [restantes] = await conexao.query(
          `SELECT id FROM inscricao
           WHERE atividade_id = ? AND status = 'espera'
           ORDER BY posicao_espera ASC`,
          [inscricao.atividade_id]
        );

        for (let i = 0; i < restantes.length; i++) {
          await conexao.query("UPDATE inscricao SET posicao_espera = ? WHERE id = ?", [
            i + 1,
            restantes[i].id,
          ]);
        }
      }
    }

    await conexao.commit();
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

module.exports = { contarConfirmados, contarEmEspera, inscrever, cancelar, buscarInscricaoPorId };