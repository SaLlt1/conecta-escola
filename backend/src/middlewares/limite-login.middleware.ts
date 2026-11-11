// Limita tentativas de login erradas por IP + e-mail (proteção contra força bruta).
// Fica em memória: simples e suficiente para o projeto. Em produção com vários
// servidores, o ideal seria guardar isso no Redis.

import type { NextFunction, Request, Response } from "express";

const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000; // 15 minutos

const tentativas = new Map<string, { contagem: number; expira: number }>();

// Limpa registros vencidos de tempos em tempos para não crescer para sempre.
setInterval(() => {
  const agora = Date.now();
  for (const [chave, registro] of tentativas) {
    if (registro.expira <= agora) tentativas.delete(chave);
  }
}, 60 * 1000).unref();

export function limitarLogin(req: Request, res: Response, next: NextFunction): void {
  const email = String(req.body?.email_institucional || "").trim().toLowerCase();
  const chave = `${req.ip}:${email}`;
  const agora = Date.now();
  const registro = tentativas.get(chave);

  if (registro && registro.expira > agora && registro.contagem >= MAX_TENTATIVAS) {
    const minutos = Math.ceil((registro.expira - agora) / 60000);
    res.status(429).json({
      erro: `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).`,
    });
    return;
  }

  // Depois que a resposta sai, conta o erro (401) ou zera o contador (sucesso).
  res.on("finish", () => {
    if (res.statusCode === 401) {
      const atual = tentativas.get(chave);
      if (atual && atual.expira > Date.now()) {
        atual.contagem += 1;
      } else {
        tentativas.set(chave, { contagem: 1, expira: Date.now() + JANELA_MS });
      }
    } else if (res.statusCode === 200) {
      tentativas.delete(chave);
    }
  });

  next();
}
