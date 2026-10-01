// Regra de negócio: controle de vagas e lista de espera.
// Uma atividade além do limite de vagas entra em espera, com posição.
// Ao desistir alguém confirmado, o primeiro da espera é promovido.

const db = require("../db/connection");

function contarConfirmados(atividadeId) {
  const linha = db
    .prepare(
      "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'confirmada'"
    )
    .get(atividadeId);
  return linha.total;
}

function contarEmEspera(atividadeId) {
  const linha = db
    .prepare(
      "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'espera'"
    )
    .get(atividadeId);
  return linha.total;
}

// Decide se a nova inscrição entra confirmada ou em espera, e grava.
// Retorna a inscrição criada.
function inscrever(atividade, usuarioId) {
  const confirmados = contarConfirmados(atividade.id);
  const temVaga = confirmados < atividade.vagas;

  if (temVaga) {
    const resultado = db
      .prepare(
        `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
         VALUES (?, ?, 'confirmada', NULL)`
      )
      .run(atividade.id, usuarioId);
    return buscarInscricaoPorId(resultado.lastInsertRowid);
  }

  const posicao = contarEmEspera(atividade.id) + 1;
  const resultado = db
    .prepare(
      `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
       VALUES (?, ?, 'espera', ?)`
    )
    .run(atividade.id, usuarioId, posicao);
  return buscarInscricaoPorId(resultado.lastInsertRowid);
}

function buscarInscricaoPorId(id) {
  return db.prepare("SELECT * FROM inscricao WHERE id = ?").get(id);
}

// Remove a inscrição. Se ela era uma vaga confirmada, promove o primeiro
// da lista de espera (se houver) e reordena as posições restantes.
function cancelar(inscricao) {
  const transacao = db.transaction(() => {
    db.prepare("DELETE FROM inscricao WHERE id = ?").run(inscricao.id);

    if (inscricao.status === "confirmada") {
      const proximo = db
        .prepare(
          `SELECT * FROM inscricao
           WHERE atividade_id = ? AND status = 'espera'
           ORDER BY posicao_espera ASC
           LIMIT 1`
        )
        .get(inscricao.atividade_id);

      if (proximo) {
        db.prepare(
          "UPDATE inscricao SET status = 'confirmada', posicao_espera = NULL WHERE id = ?"
        ).run(proximo.id);

        // Reordena quem ficou na espera, fechando o buraco deixado.
        const restantes = db
          .prepare(
            `SELECT id FROM inscricao
             WHERE atividade_id = ? AND status = 'espera'
             ORDER BY posicao_espera ASC`
          )
          .all(inscricao.atividade_id);

        restantes.forEach((linha, indice) => {
          db.prepare("UPDATE inscricao SET posicao_espera = ? WHERE id = ?").run(
            indice + 1,
            linha.id
          );
        });
      }
    }
  });

  transacao();
}

module.exports = { contarConfirmados, contarEmEspera, inscrever, cancelar, buscarInscricaoPorId };