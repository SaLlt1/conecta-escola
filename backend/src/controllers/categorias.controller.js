const db = require("../db/connection");

async function listar(req, res, next) {
  try {
    const [categorias] = await db.query("SELECT id, nome FROM categoria ORDER BY nome");
    return res.json(categorias);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar };