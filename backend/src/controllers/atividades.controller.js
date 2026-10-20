const db = require("../db/connection");
const { ordenarPorAfinidade } = require("../services/afinidade.service");
const { contarConfirmados } = require("../services/vagas.service");

async function comVagasRestantes(atividade) {
  const confirmados = await contarConfirmados(atividade.id);
  return {
    ...atividade,
    vagas_restantes: Math.max(atividade.vagas - confirmados, 0),
    inscritos_confirmados: confirmados,
  };
}

async function listar(req, res, next) {
  try {
    const { categoria_id } = req.query;

    let sql = `
      SELECT atividade.*, categoria.nome AS categoria_nome
      FROM atividade
      JOIN categoria ON categoria.id = atividade.categoria_id
      WHERE atividade.status = 'ativa'
    `;
    const params = [];

    if (categoria_id) {
      sql += " AND atividade.categoria_id = ?";
      params.push(Number(categoria_id));
    }

    sql += " ORDER BY atividade.id DESC";

    const [linhas] = await db.query(sql, params);
    const atividades = await Promise.all(linhas.map(comVagasRestantes));
    const usuarioId = req.usuario ? req.usuario.id : null;
    const comAfinidade = await ordenarPorAfinidade(atividades, usuarioId);

    return res.json(comAfinidade);
  } catch (err) {
    return next(err);
  }
}

async function detalhes(req, res, next) {
  try {
    const [[atividade]] = await db.query(
      `SELECT atividade.*, categoria.nome AS categoria_nome
       FROM atividade
       JOIN categoria ON categoria.id = atividade.categoria_id
       WHERE atividade.id = ?`,
      [req.params.id]
    );

    if (!atividade) {
      return res.status(404).json({ erro: "Atividade não encontrada." });
    }

    const comInfo = await comVagasRestantes(atividade);
    const usuarioId = req.usuario ? req.usuario.id : null;
    const [comAfinidade] = await ordenarPorAfinidade([comInfo], usuarioId);

    return res.json(comAfinidade);
  } catch (err) {
    return next(err);
  }
}

function validarCamposAtividade(body) {
  const { nome, categoria_id, vagas } = body || {};
  if (!nome || !String(nome).trim()) return "Nome da atividade é obrigatório.";
  if (!Number.isInteger(Number(categoria_id))) return "Categoria é obrigatória.";
  if (!Number.isInteger(Number(vagas)) || Number(vagas) <= 0) {
    return "Vagas deve ser um número inteiro positivo.";
  }
  return null;
}

async function criar(req, res, next) {
  try {
    const erro = validarCamposAtividade(req.body);
    if (erro) return res.status(400).json({ erro });

    const { nome, descricao, categoria_id, local, horario, vagas } = req.body;

    const [[categoria]] = await db.query("SELECT id FROM categoria WHERE id = ?", [categoria_id]);
    if (!categoria) return res.status(400).json({ erro: "Categoria não existe." });

    const [resultado] = await db.query(
      `INSERT INTO atividade (nome, descricao, categoria_id, local, horario, vagas, responsavel_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ativa')`,
      [nome, descricao || null, categoria_id, local || null, horario || null, vagas, req.usuario.id]
    );

    const [[criada]] = await db.query("SELECT * FROM atividade WHERE id = ?", [resultado.insertId]);
    return res.status(201).json(criada);
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const [[atividade]] = await db.query("SELECT * FROM atividade WHERE id = ?", [req.params.id]);
    if (!atividade) return res.status(404).json({ erro: "Atividade não encontrada." });

    if (atividade.responsavel_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Só quem criou a atividade pode editá-la." });
    }

    const campos = ["nome", "descricao", "categoria_id", "local", "horario", "vagas", "status"];
    const atualizacoes = {};
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
    });

    if (atualizacoes.status && !["ativa", "inativa"].includes(atualizacoes.status)) {
      return res.status(400).json({ erro: "Status inválido." });
    }
    if (
      atualizacoes.vagas !== undefined &&
      (!Number.isInteger(Number(atualizacoes.vagas)) || Number(atualizacoes.vagas) <= 0)
    ) {
      return res.status(400).json({ erro: "Vagas deve ser um número inteiro positivo." });
    }

    const chaves = Object.keys(atualizacoes);
    if (chaves.length === 0) {
      return res.status(400).json({ erro: "Nenhum campo para atualizar." });
    }

    const sets = chaves.map((c) => `${c} = ?`).join(", ");
    const valores = chaves.map((c) => atualizacoes[c]);
    await db.query(`UPDATE atividade SET ${sets} WHERE id = ?`, [...valores, atividade.id]);

    const [[atualizada]] = await db.query("SELECT * FROM atividade WHERE id = ?", [atividade.id]);
    return res.json(atualizada);
  } catch (err) {
    return next(err);
  }
}

async function inscritos(req, res, next) {
  try {
    const [[atividade]] = await db.query("SELECT * FROM atividade WHERE id = ?", [req.params.id]);
    if (!atividade) return res.status(404).json({ erro: "Atividade não encontrada." });

    if (atividade.responsavel_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Só o responsável pela atividade vê os inscritos." });
    }

    const [lista] = await db.query(
      `SELECT inscricao.id, inscricao.status, inscricao.posicao_espera, inscricao.criada_em,
              usuario.id AS usuario_id, usuario.nome, usuario.turma
       FROM inscricao
       JOIN usuario ON usuario.id = inscricao.usuario_id
       WHERE inscricao.atividade_id = ?
       ORDER BY (inscricao.status = 'espera'), inscricao.posicao_espera, inscricao.criada_em`,
      [atividade.id]
    );

    return res.json(lista);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, detalhes, criar, atualizar, inscritos };