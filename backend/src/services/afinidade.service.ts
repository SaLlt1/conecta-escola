import db from "../db/connection";
import type { Linha } from "../types";

export async function buscarInteressesDoUsuario(usuarioId: number): Promise<Set<number>> {
  const [linhas] = await db.query<Linha<{ categoria_id: number }>[]>(
    "SELECT categoria_id FROM interesse_usuario WHERE usuario_id = ?",
    [usuarioId]
  );
  return new Set(linhas.map((l) => l.categoria_id));
}

// Aceita qualquer objeto que tenha categoria_id e devolve o mesmo objeto + `compativel`.
export async function ordenarPorAfinidade<T extends { categoria_id: number }>(
  atividades: T[],
  usuarioId: number | null
): Promise<(T & { compativel: boolean })[]> {
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