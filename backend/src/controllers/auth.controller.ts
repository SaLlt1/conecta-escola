import type { NextFunction, Request, Response } from "express";
import { compare, hash } from "bcryptjs";
import { timingSafeEqual } from "crypto";
import type { ResultSetHeader } from "mysql2";
import jwt from "jsonwebtoken";
import db from "../db/connection";
import { env } from "../config/env";
import type { Linha, Papel, Usuario } from "../types";

const DOMINIO_INSTITUCIONAL = env.DOMINIO_INSTITUCIONAL;
const PAPEIS_VALIDOS: Papel[] = ["aluno", "responsavel"];

function emailValido(email: unknown): boolean {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }
  if (DOMINIO_INSTITUCIONAL && !email.toLowerCase().endsWith(DOMINIO_INSTITUCIONAL.toLowerCase())) {
    return false;
  }
  return true;
}

// Compara o código informado com o do .env sem vazar informação pelo tempo de resposta.
function codigoResponsavelCorreto(informado: unknown): boolean {
  const esperado = env.CODIGO_RESPONSAVEL;
  if (!esperado || typeof informado !== "string") return false;
  const a = Buffer.from(informado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, senha, papel, turma, codigo_acesso } = req.body || {};
    const email_institucional =
      typeof req.body?.email_institucional === "string"
        ? req.body.email_institucional.trim().toLowerCase()
        : "";

    if (!nome || !String(nome).trim()) {
      res.status(400).json({ erro: "Nome é obrigatório." });
      return;
    }
    if (!emailValido(email_institucional)) {
      res.status(400).json({ erro: "E-mail institucional inválido." });
      return;
    }
    if (!senha || String(senha).length < 6) {
      res.status(400).json({ erro: "Senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (!PAPEIS_VALIDOS.includes(papel)) {
      res.status(400).json({ erro: "Papel deve ser 'aluno' ou 'responsavel'." });
      return;
    }

    // Só a coordenação (que conhece o código) pode criar contas de responsável.
    if (papel === "responsavel" && !codigoResponsavelCorreto(codigo_acesso)) {
      res.status(403).json({ erro: "Código de responsável inválido." });
      return;
    }

    const [existentes] = await db.query<Linha<{ id: number }>[]>(
      "SELECT id FROM usuario WHERE email_institucional = ?",
      [email_institucional]
    );
    if (existentes.length > 0) {
      res.status(409).json({ erro: "Já existe cadastro com esse e-mail." });
      return;
    }

    const senhaHash = await hash(String(senha), 10);

    const [resultado] = await db.query<ResultSetHeader>(
      `INSERT INTO usuario (nome, email_institucional, senha_hash, papel, turma)
       VALUES (?, ?, ?, ?, ?)`,
      [String(nome).trim(), email_institucional, senhaHash, papel, turma || null]
    );

    const [[usuario]] = await db.query<Linha<Omit<Usuario, "senha_hash">>[]>(
      "SELECT id, nome, email_institucional, papel, turma FROM usuario WHERE id = ?",
      [resultado.insertId]
    );

    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { senha } = req.body || {};
    const email_institucional =
      typeof req.body?.email_institucional === "string"
        ? req.body.email_institucional.trim().toLowerCase()
        : "";

    if (!email_institucional || !senha) {
      res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
      return;
    }

    const [[usuario]] = await db.query<Linha<Usuario>[]>(
      "SELECT * FROM usuario WHERE email_institucional = ?",
      [email_institucional]
    );

    if (!usuario || !(await compare(String(senha), usuario.senha_hash))) {
      res.status(401).json({ erro: "E-mail ou senha inválidos." });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, papel: usuario.papel, nome: usuario.nome },
      env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email_institucional: usuario.email_institucional,
        papel: usuario.papel,
        turma: usuario.turma,
      },
    });
  } catch (err) {
    next(err);
  }
}
