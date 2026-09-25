// Middleware de autenticação: valida o token e identifica o papel do usuário (aluno/responsavel).
// Autenticação (JWT) e autorização por papel.
// Nenhuma rota de listagem de alunos existe neste sistema (decisão de projeto).

const jwt = require("jsonwebtoken");
require("dotenv").config();

const SEGREDO = process.env.JWT_SECRET;

// Exige um token válido. Preenche req.usuario = { id, papel, nome }.
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, SEGREDO);
    req.usuario = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

// Não bloqueia a requisição se não houver token — usado em rotas públicas
// (ex.: mural) que ficam melhores quando sabem quem é o usuário, mas
// continuam funcionando sem login.
function autenticarOpcional(req, res, next) {
  const authHeader = req.headers.authorization;


  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.usuario = null;
    return next();
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    req.usuario = jwt.verify(token, SEGREDO);
  } catch (err) {
    req.usuario = null;
  }

  return next();
}

// Só deixa passar usuários com papel "responsavel" (coordenação/professor).
function somenteResponsavel(req, res, next) {
  if (!req.usuario || req.usuario.papel !== "responsavel") {
    return res.status(403).json({ erro: "Acesso restrito ao responsável." });
  }
  return next();
}

// Só deixa passar usuários com papel "aluno".
function somenteAluno(req, res, next) {
  if (!req.usuario || req.usuario.papel !== "aluno") {
    return res.status(403).json({ erro: "Acesso restrito ao aluno." });
  }
  return next();
}


module.exports = { autenticar, autenticarOpcional, somenteResponsavel, somenteAluno };