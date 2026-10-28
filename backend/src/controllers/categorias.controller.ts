import type { NextFunction, Request, Response } from "express";
import db from "../db/connection";
import type { Categoria, Linha } from "../types";

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [categorias] = await db.query<Linha<Categoria>[]>(
      "SELECT id, nome FROM categoria ORDER BY nome"
    );
    res.json(categorias);
  } catch (err) {
    next(err);
  }
}