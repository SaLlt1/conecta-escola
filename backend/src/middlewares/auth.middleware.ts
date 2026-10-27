// Middleware de autenticação: valida o token e identifica o papel do usuário (aluno/responsavel).
// Autenticação (JWT) e autorização por papel.
// Nenhuma rota de listagem de alunos existe neste sistema (decisão de projeto).

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UsuarioToken } from "../types";

// Ensina o TypeScript que `req.usuario` existe no Request do Express.
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken | null;
    }
  }
}

function extrairToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

// jwt.verify devolve `string | JwtPayload`; aqui garantimos o formato UsuarioToken.
function lerToken(token: string): UsuarioToken {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string") {
    throw new Error("Payload do token inválido.");
  }
  return { id: payload.id, papel: payload.papel, nome: payload.nome };
}

// Exige um token válido. Preenche req.usuario = { id, papel, nome }.
export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const token = extrairToken(req);

  if (!token) {
    res.status(401).json({ erro: "Token não fornecido." });
    return;
  }

  try {
    req.usuario = lerToken(token);
    next();
  } catch (err) {
    res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

// Não bloqueia a requisição se não houver token — usado em rotas públicas
// (ex.: mural) que ficam melhores quando sabem quem é o usuário, mas
// continuam funcionando sem login.
export function autenticarOpcional(req: Request, res: Response, next: NextFunction): void {
  const token = extrairToken(req);

  if (!token) {
    req.usuario = null;
    next();
    return;
  }

  try {
    req.usuario = lerToken(token);
  } catch (err) {
    req.usuario = null;
  }

  next();
}

// Só deixa passar usuários com papel "responsavel" (coordenação/professor).
export function somenteResponsavel(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario || req.usuario.papel !== "responsavel") {
    res.status(403).json({ erro: "Acesso restrito ao responsável." });
    return;
  }
  next();
}

// Só deixa passar usuários com papel "aluno".
export function somenteAluno(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario || req.usuario.papel !== "aluno") {
    res.status(403).json({ erro: "Acesso restrito ao aluno." });
    return;
  }
  next();
}