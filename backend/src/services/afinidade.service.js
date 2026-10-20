const db = require("../db/connection");

async function buscarInteressesDoUsuario(usuarioId) {
  const [linhas] = await db.query(
    "SELECT categoria_id FROM interesse_usuario WHERE usuario_id = ?",
    [usuarioId]
  );
  return new Set(linhas.map((l) => l.categoria_id));
}

async function ordenarPorAfinidade(atividades, usuarioId) {
  if (!usuarioId) {
    return atividades.map((a) => ({ ...a, compativel: false }));
  }
  const interesses = await buscarInteressesDoUsuario(usuarioId);
  const marcadas = atividades.map((a) => ({
    ...a,
    compativel: interesses.has(a.categoria_id),
  }));
  marcadas.sort((a, b) => Number(b.compativel) - Number(a.compativel));
  return marcadas;
}

module.exports = { buscarInteressesDoUsuario, ordenarPorAfinidade };