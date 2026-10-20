const db = require("../db/connection");
const { interessesAgregados } = require("../services/agregacao.service");

async function atualizarMeusInteresses(req, res, next) {
  try {
    const { categorias } = req.body || {};

    if (!Array.isArray(categorias) || categorias.length === 0) {
      return res.status(400).json({ erro: "Selecione pelo menos um interesse." });
    }

    const ids = [...new Set(categorias.map(Number))];
    if (ids.some((id) => !Number.isInteger(id))) {
      return res.status(400).json({ erro: "Lista de categorias inválida." });
    }

    const placeholders = ids.map(() => "?").join(",");
    const [validas] = await db.query(
      `SELECT id FROM categoria WHERE id IN (${placeholders})`,
      ids
    );

    if (validas.length !== ids.length) {
      return res.status(400).json({ erro: "Uma ou mais categorias não existem." });
    }

    const usuarioId = req.usuario.id;
    const conexao = await db.getConnection();
    try {
      await conexao.beginTransaction();
      await conexao.query("DELETE FROM interesse_usuario WHERE usuario_id = ?", [usuarioId]);
      for (const categoriaId of ids) {
        await conexao.query(
          "INSERT INTO interesse_usuario (usuario_id, categoria_id) VALUES (?, ?)",
          [usuarioId, categoriaId]
        );
      }
      await conexao.commit();
    } catch (err) {
      await conexao.rollback();
      throw err;
    } finally {
      conexao.release();
    }

    const [atualizados] = await db.query(
      `SELECT categoria.id, categoria.nome
       FROM interesse_usuario
       JOIN categoria ON categoria.id = interesse_usuario.categoria_id
       WHERE interesse_usuario.usuario_id = ?
       ORDER BY categoria.nome`,
      [usuarioId]
    );

    return res.json(atualizados);
  } catch (err) {
    return next(err);
  }
}

async function agregados(req, res, next) {
  try {
    return res.json(await interessesAgregados());
  } catch (err) {
    return next(err);
  }
}

module.exports = { atualizarMeusInteresses, agregados };