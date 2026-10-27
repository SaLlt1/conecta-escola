import type { NextFunction, Request, Response } from "express";
import db from "../db/connection";
import { interessesAgregados } from "../services/agregacao.service";
import type { Categoria, Linha } from "../types";

export async function atualizarMeusInteresses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { categorias } = req.body || {};

    if (!Array.isArray(categorias) || categorias.length === 0) {
      res.status(400).json({ erro: "Selecione pelo menos um interesse." });
      return;
    }

    const ids: number[] = [...new Set(categorias.map(Number))];
    if (ids.some((id) => !Number.isInteger(id))) {
      res.status(400).json({ erro: "Lista de categorias inválida." });
      return;
    }

    const placeholders = ids.map(() => "?").join(",");
    const [validas] = await db.query<Linha<{ id: number }>[]>(
      `SELECT id FROM categoria WHERE id IN (${placeholders})`,
      ids
    );

    if (validas.length !== ids.length) {
      res.status(400).json({ erro: "Uma ou mais categorias não existem." });
      return;
    }

    const usuarioId = req.usuario!.id;
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

    const [atualizados] = await db.query<Linha<Categoria>[]>(
      `SELECT categoria.id, categoria.nome
       FROM interesse_usuario
       JOIN categoria ON categoria.id = interesse_usuario.categoria_id
       WHERE interesse_usuario.usuario_id = ?
       ORDER BY categoria.nome`,
      [usuarioId]
    );

    res.json(atualizados);
  } catch (err) {
    next(err);
  }
}

export async function agregados(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await interessesAgregados());
  } catch (err) {
    next(err);
  }
}