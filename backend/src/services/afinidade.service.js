// Regra de negócio: afinidade entre os interesses do aluno e as atividades.
// É contagem de coincidências (JOIN simples), não é IA — e não deve ser
// chamada de IA em nenhuma tela ou pitch.

const db = require("../db/connection");

// Retorna o conjunto de ids de categoria marcados como interesse do usuário.
function buscarInteressesDoUsuario(usuarioId) {
  const linhas = db
    .prepare("SELECT categoria_id FROM interesse_usuario WHERE usuario_id = ?")
    .all(usuarioId);
  return new Set(linhas.map((l) => l.categoria_id));
}

// Marca cada atividade com "compativel" (true/false) de acordo com os
// interesses do usuário logado. Cada atividade tem uma única categoria,
// então a afinidade aqui é binária (compatível ou não); atividades
// compatíveis são ordenadas primeiro.
function ordenarPorAfinidade(atividades, usuarioId) {
  if (!usuarioId) {
    return atividades.map((a) => ({ ...a, compativel: false }));
  }

  const interesses = buscarInteressesDoUsuario(usuarioId);

  const marcadas = atividades.map((a) => ({
    ...a,
    compativel: interesses.has(a.categoria_id),
  }));

  marcadas.sort((a, b) => Number(b.compativel) - Number(a.compativel));
  return marcadas;

}

module.exports = { buscarInteressesDoUsuario, ordenarPorAfinidade };