import type { ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import db from "../db/connection";
import type { Atividade, Inscricao, Linha } from "../types";

type Total = Linha<{ total: number }>;

export async function contarConfirmados(atividadeId: number): Promise<number> {
  const [[linha]] = await db.query<Total[]>(
    "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'confirmada'",
    [atividadeId]
  );
  return linha.total;
}

export async function contarEmEspera(atividadeId: number): Promise<number> {
  const [[linha]] = await db.query<Total[]>(
    "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'espera'",
    [atividadeId]
  );
  return linha.total;
}

export async function buscarInscricaoPorId(id: number): Promise<Linha<Inscricao>> {
  const [[inscricao]] = await db.query<Linha<Inscricao>[]>(
    "SELECT * FROM inscricao WHERE id = ?",
    [id]
  );
  return inscricao;
}

// Reescreve as posições da fila como 1, 2, 3... sem buracos.
async function renumerarFila(conexao: PoolConnection, atividadeId: number): Promise<void> {
  const [fila] = await conexao.query<Linha<{ id: number }>[]>(
    `SELECT id FROM inscricao
     WHERE atividade_id = ? AND status = 'espera'
     ORDER BY posicao_espera ASC, criada_em ASC, id ASC`,
    [atividadeId]
  );

  for (let i = 0; i < fila.length; i++) {
    await conexao.query("UPDATE inscricao SET posicao_espera = ? WHERE id = ?", [
      i + 1,
      fila[i].id,
    ]);
  }
}

// Promove quem estiver na espera enquanto houver vaga livre e arruma a fila.
// Deve ser chamada DENTRO de uma transação já aberta.
async function reequilibrar(conexao: PoolConnection, atividadeId: number): Promise<void> {
  const [[atividade]] = await conexao.query<Linha<{ vagas: number }>[]>(
    "SELECT vagas FROM atividade WHERE id = ? FOR UPDATE",
    [atividadeId]
  );
  if (!atividade) return;

  const [[contagem]] = await conexao.query<Total[]>(
    "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'confirmada'",
    [atividadeId]
  );

  const livres = atividade.vagas - contagem.total;

  if (livres > 0) {
    const [proximos] = await conexao.query<Linha<{ id: number }>[]>(
      `SELECT id FROM inscricao
       WHERE atividade_id = ? AND status = 'espera'
       ORDER BY posicao_espera ASC
       LIMIT ?`,
      [atividadeId, livres]
    );

    for (const proximo of proximos) {
      await conexao.query(
        "UPDATE inscricao SET status = 'confirmada', posicao_espera = NULL WHERE id = ?",
        [proximo.id]
      );
    }
  }

  await renumerarFila(conexao, atividadeId);
}

// Usada quando o responsável edita a atividade (ex.: aumenta o número de vagas).
export async function reequilibrarFila(atividadeId: number): Promise<void> {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    await reequilibrar(conexao, atividadeId);
    await conexao.commit();
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

export async function inscrever(atividade: Atividade, usuarioId: number): Promise<Linha<Inscricao>> {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    // Trava a linha da atividade: inscrições simultâneas na mesma atividade
    // passam a ser processadas uma de cada vez, então ninguém ultrapassa o limite.
    const [[atual]] = await conexao.query<Linha<{ vagas: number }>[]>(
      "SELECT vagas FROM atividade WHERE id = ? FOR UPDATE",
      [atividade.id]
    );

    const [[contagem]] = await conexao.query<Total[]>(
      "SELECT COUNT(*) AS total FROM inscricao WHERE atividade_id = ? AND status = 'confirmada'",
      [atividade.id]
    );

    let resultado: ResultSetHeader;

    if (contagem.total < atual.vagas) {
      [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
         VALUES (?, ?, 'confirmada', NULL)`,
        [atividade.id, usuarioId]
      );
    } else {
      const [[fila]] = await conexao.query<Linha<{ proxima: number }>[]>(
        `SELECT COALESCE(MAX(posicao_espera), 0) + 1 AS proxima
         FROM inscricao WHERE atividade_id = ? AND status = 'espera'`,
        [atividade.id]
      );
      [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO inscricao (atividade_id, usuario_id, status, posicao_espera)
         VALUES (?, ?, 'espera', ?)`,
        [atividade.id, usuarioId, fila.proxima]
      );
    }

    const [[inscricao]] = await conexao.query<Linha<Inscricao>[]>(
      "SELECT * FROM inscricao WHERE id = ?",
      [resultado.insertId]
    );

    await conexao.commit();
    return inscricao;
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

export async function cancelar(inscricao: Inscricao): Promise<void> {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    // Mesma ordem de trava da inscrição (atividade primeiro) para evitar deadlock.
    await conexao.query("SELECT id FROM atividade WHERE id = ? FOR UPDATE", [
      inscricao.atividade_id,
    ]);

    await conexao.query("DELETE FROM inscricao WHERE id = ?", [inscricao.id]);

    // Promove o próximo da fila (se abriu vaga) e renumera a fila,
    // inclusive quando quem saiu estava na espera.
    await reequilibrar(conexao, inscricao.atividade_id);

    await conexao.commit();
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}
