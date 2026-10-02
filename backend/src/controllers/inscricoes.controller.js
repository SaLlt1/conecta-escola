const db = require("../db/connection");
const vagasService = require("../services/vagas.service");

async function inscrever(req, res, next) {
  try {
    const atividadeId = req.params.id;
    const usuarioId = req.usuario.id;

    const [[atividade]] = await db.query("SELECT * FROM atividade WHERE id = ?", [atividadeId]);
    if (!atividade) return res.status(404).json({ erro: "Atividade não encontrada." });
    if (atividade.status !== "ativa") {
      return res.status(409).json({ erro: "Esta atividade não está mais aceitando inscrições." });
    }

    const [[existente]] = await db.query(
      "SELECT id FROM inscricao WHERE atividade_id = ? AND usuario_id = ?",
      [atividadeId, usuarioId]
    );
    if (existente) {
      return res.status(409).json({ erro: "Você já está inscrito nesta atividade." });
    }

    const inscricao = await vagasService.inscrever(atividade, usuarioId);

    const mensagem =
      inscricao.status === "confirmada"
        ? "Inscrição confirmada."
        : `Vagas esgotadas — você entrou na lista de espera, posição ${inscricao.posicao_espera}.`;

    return res.status(201).json({ ...inscricao, mensagem });
  } catch (err) {
    return next(err);
  }
}

async function desistir(req, res, next) {
  try {
    const [[inscricao]] = await db.query("SELECT * FROM inscricao WHERE id = ?", [req.params.id]);
    if (!inscricao) return res.status(404).json({ erro: "Inscrição não encontrada." });

    if (inscricao.usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Você só pode cancelar sua própria inscrição." });
    }

    await vagasService.cancelar(inscricao);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function minhasInscricoes(req, res, next) {
  try {
    const [lista] = await db.query(
      `SELECT inscricao.id, inscricao.status, inscricao.posicao_espera, inscricao.criada_em,
              atividade.id AS atividade_id, atividade.nome AS atividade_nome,
              atividade.local, atividade.horario, atividade.status AS atividade_status
       FROM inscricao
       JOIN atividade ON atividade.id = inscricao.atividade_id
       WHERE inscricao.usuario_id = ?
       ORDER BY inscricao.criada_em DESC`,
      [req.usuario.id]
    );

    return res.json(lista);
  } catch (err) {
    return next(err);
  }
}

module.exports = { inscrever, desistir, minhasInscricoes };