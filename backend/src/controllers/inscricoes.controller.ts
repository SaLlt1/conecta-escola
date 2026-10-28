import type { NextFunction, Request, Response } from "express";
import db from "../db/connection";
import * as vagasService from "../services/vagas.service";
import { lerId } from "../utils/requisicao";
import type { Atividade, Inscricao, Linha } from "../types";

export async function inscrever(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const atividadeId = lerId(req.params.id);
    if (!atividadeId) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }
    const usuarioId = req.usuario!.id;

    const [[atividade]] = await db.query<Linha<Atividade>[]>(
      "SELECT * FROM atividade WHERE id = ?",
      [atividadeId]
    );
    if (!atividade) {
      res.status(404).json({ erro: "Atividade não encontrada." });
      return;
    }
    if (atividade.status !== "ativa") {
      res.status(409).json({ erro: "Esta atividade não está mais aceitando inscrições." });
      return;
    }

    const [[existente]] = await db.query<Linha<{ id: number }>[]>(
      "SELECT id FROM inscricao WHERE atividade_id = ? AND usuario_id = ?",
      [atividadeId, usuarioId]
    );
    if (existente) {
      res.status(409).json({ erro: "Você já está inscrito nesta atividade." });
      return;
    }

    const inscricao = await vagasService.inscrever(atividade, usuarioId);

    const mensagem =
      inscricao.status === "confirmada"
        ? "Inscrição confirmada."
        : `Vagas esgotadas — você entrou na lista de espera, posição ${inscricao.posicao_espera}.`;

    res.status(201).json({ ...inscricao, mensagem });
  } catch (err) {
    next(err);
  }
}

export async function desistir(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = lerId(req.params.id);
    if (!id) {
      res.status(404).json({ erro: "Inscrição não encontrada." });
      return;
    }

    const [[inscricao]] = await db.query<Linha<Inscricao>[]>(
      "SELECT * FROM inscricao WHERE id = ?",
      [id]
    );
    if (!inscricao) {
      res.status(404).json({ erro: "Inscrição não encontrada." });
      return;
    }

    if (inscricao.usuario_id !== req.usuario!.id) {
      res.status(403).json({ erro: "Você só pode cancelar sua própria inscrição." });
      return;
    }

    await vagasService.cancelar(inscricao);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function minhasInscricoes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [lista] = await db.query<Linha<{ id: number }>[]>(
      `SELECT inscricao.id, inscricao.status, inscricao.posicao_espera, inscricao.criada_em,
              atividade.id AS atividade_id, atividade.nome AS atividade_nome,
              atividade.local, atividade.horario, atividade.status AS atividade_status
       FROM inscricao
       JOIN atividade ON atividade.id = inscricao.atividade_id
       WHERE inscricao.usuario_id = ?
       ORDER BY inscricao.criada_em DESC`,
      [req.usuario!.id]
    );

    res.json(lista);
  } catch (err) {
    next(err);
  }
}