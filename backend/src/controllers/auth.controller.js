const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("../db/connection");

const DOMINIO_INSTITUCIONAL = process.env.DOMINIO_INSTITUCIONAL || null;
const PAPEIS_VALIDOS = ["aluno", "responsavel"];

function emailValido(email) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }
  if (DOMINIO_INSTITUCIONAL && !email.toLowerCase().endsWith(DOMINIO_INSTITUCIONAL.toLowerCase())) {
    return false;
  }
  return true;
}

async function registrar(req, res, next) {
  try {
    const { nome, email_institucional, senha, papel, turma } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ erro: "Nome é obrigatório." });
    }
    if (!emailValido(email_institucional)) {
      return res.status(400).json({ erro: "E-mail institucional inválido." });
    }
    if (!senha || String(senha).length < 6) {
      return res.status(400).json({ erro: "Senha deve ter pelo menos 6 caracteres." });
    }
    if (!PAPEIS_VALIDOS.includes(papel)) {
      return res.status(400).json({ erro: "Papel deve ser 'aluno' ou 'responsavel'." });
    }

    const [existentes] = await db.query(
      "SELECT id FROM usuario WHERE email_institucional = ?",
      [email_institucional]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ erro: "Já existe cadastro com esse e-mail." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await db.query(
      `INSERT INTO usuario (nome, email_institucional, senha_hash, papel, turma)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, email_institucional, senhaHash, papel, turma || null]
    );

    const [[usuario]] = await db.query(
      "SELECT id, nome, email_institucional, papel, turma FROM usuario WHERE id = ?",
      [resultado.insertId]
    );

    return res.status(201).json(usuario);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email_institucional, senha } = req.body || {};

    if (!email_institucional || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    const [[usuario]] = await db.query(
      "SELECT * FROM usuario WHERE email_institucional = ?",
      [email_institucional]
    );

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign(
      { id: usuario.id, papel: usuario.papel, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
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
    return next(err);
  }
}

module.exports = { registrar, login };