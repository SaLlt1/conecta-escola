import type { NextFunction, Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import db from "../db/connection";
import { ordenarPorAfinidade } from "../services/afinidade.service";
import { contarConfirmados } from "../services/vagas.service";
import { lerId, lerTexto } from "../utils/requisicao";
import type { Atividade, Linha } from "../types";

type AtividadeComCategoria = Atividade & { categoria_nome: string };

async function comVagasRestantes<T extends Atividade>(atividade: T) {
  const confirmados = await contarConfirmados(atividade.id);
  return {
    ...atividade,
    vagas_restantes: Math.max(atividade.vagas - confirmados, 0),
    inscritos_confirmados: confirmados,
  };
}

export async function listar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoriaId = lerTexto(req.query.categoria_id);

    let sql = `
      SELECT atividade.*, categoria.nome AS categoria_nome
      FROM atividade
      JOIN categoria ON categoria.id = atividade.categoria_id
      WHERE atividade.status = 'ativa'
    `;
    const params: number[] = [];

    if (categoriaId) {
      sql += " AND atividade.categoria_id = ?";
      params.push(Number(categoriaId));
    }

    sql += " ORDER BY atividade.id DESC";

    const [linhas] = await db.query<Linha<AtividadeComCategoria>[]>(sql, params);
    const atividades = await Promise.all(linhas.map(comVagasRestantes));
    const usuarioId = req.usuario ? req.usuario.id : null;
    const comAfinidade = await ordenarPorAfinidade(atividades, usuarioId);

    res.json(comAfinidade);
  } catch (err) {
    next(err);
  }
}

export async function detalhes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = lerId(req.params.id);
    if (!id) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    const [[atividade]] = await db.query<Linha<AtividadeComCategoria>[]>(
      `SELECT atividade.*, categoria.nome AS categoria_nome
       FROM atividade
       JOIN categoria ON categoria.id = atividade.categoria_id
       WHERE atividade.id = ?`,
      [id]
    );

    if (!atividade) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    const comInfo = await comVagasRestantes(atividade);
    const usuarioId = req.usuario ? req.usuario.id : null;
    const [comAfinidade] = await ordenarPorAfinidade([comInfo], usuarioId);

    res.json(comAfinidade);
  } catch (err) {
    next(err);
  }
}

function validarCamposAtividade(body: any): string | null {
  const { nome, categoria_id, vagas } = body || {};
  if (!nome || !String(nome).trim()) return "Nome da atividade é obrigatório.";
  if (!Number.isInteger(Number(categoria_id))) return "Categoria é obrigatória.";
  if (!Number.isInteger(Number(vagas)) || Number(vagas) <= 0) {
    return "Vagas deve ser um número inteiro positivo.";
  }
  return null;
}

export async function criar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const erro = validarCamposAtividade(req.body);
    if (erro) {
      res.status(400).json({ erro });
      return;
    }

    const { nome, descricao, categoria_id, local, horario, vagas } = req.body;

    const [[categoria]] = await db.query<Linha<{ id: number }>[]>(
      "SELECT id FROM categoria WHERE id = ?",
      [categoria_id]
    );
    if (!categoria) {
      res.status(400).json({ erro: "Categoria não existe." });
      return;
    }

    const [resultado] = await db.query<ResultSetHeader>(
      `INSERT INTO atividade (nome, descricao, categoria_id, local, horario, vagas, responsavel_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ativa')`,
      [nome, descricao || null, categoria_id, local || null, horario || null, vagas, req.usuario!.id]
    );

    const [[criada]] = await db.query<Linha<Atividade>[]>(
      "SELECT * FROM atividade WHERE id = ?",
      [resultado.insertId]
    );
    res.status(201).json(criada);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = lerId(req.params.id);
    if (!id) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    const [[atividade]] = await db.query<Linha<Atividade>[]>(
      "SELECT * FROM atividade WHERE id = ?",
      [id]
    );
    if (!atividade) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    if (atividade.responsavel_id !== req.usuario!.id) {
      res.status(403).json({ erro: "Só quem criou a atividade pode editá-la." });
      return;
    }

    const campos = ["nome", "descricao", "categoria_id", "local", "horario", "vagas", "status"];
    const atualizacoes: Record<string, unknown> = {};
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo];
    });

    if (atualizacoes.status && !["ativa", "inativa"].includes(String(atualizacoes.status))) {
      res.status(400).json({ erro: "Status inválido." });
      return;
    }
    if (
      atualizacoes.vagas !== undefined &&
      (!Number.isInteger(Number(atualizacoes.vagas)) || Number(atualizacoes.vagas) <= 0)
    ) {
      res.status(400).json({ erro: "Vagas deve ser um número inteiro positivo." });
      return;
    }

    const chaves = Object.keys(atualizacoes);
    if (chaves.length === 0) {
      res.status(400).json({ erro: "Nenhum campo para atualizar." });
      return;
    }

    const sets = chaves.map((c) => `${c} = ?`).join(", ");
    const valores = chaves.map((c) => atualizacoes[c]);
    await db.query(`UPDATE atividade SET ${sets} WHERE id = ?`, [...valores, atividade.id]);

    const [[atualizada]] = await db.query<Linha<Atividade>[]>(
      "SELECT * FROM atividade WHERE id = ?",
      [atividade.id]
    );
    res.json(atualizada);
  } catch (err) {
    next(err);
  }
}

export async function inscritos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = lerId(req.params.id);
    if (!id) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    const [[atividade]] = await db.query<Linha<Atividade>[]>(
      "SELECT * FROM atividade WHERE id = ?",
      [id]
    );
    if (!atividade) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }

    if (atividade.responsavel_id !== req.usuario!.id) {
      res.status(403).json({ erro: "Só o responsável pela atividade vê os inscritos." });
      return;
    }

    const [lista] = await db.query<Linha<{ id: number }>[]>(
      `SELECT inscricao.id, inscricao.status, inscricao.posicao_espera, inscricao.criada_em,
              usuario.id AS usuario_id, usuario.nome, usuario.turma
       FROM inscricao
       JOIN usuario ON usuario.id = inscricao.usuario_id
       WHERE inscricao.atividade_id = ?
       ORDER BY (inscricao.status = 'espera'), inscricao.posicao_espera, inscricao.criada_em`,
      [atividade.id]
    );

    res.json(lista);
  } catch (err) {
    next(err);
  }
}