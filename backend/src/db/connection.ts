// Conexão única com o banco SQLite (better-sqlite3) e aplicação do schema.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "..", "mural.db");

const db = new Database(DB_PATH);

// Chaves estrangeiras precisam ser ligadas explicitamente no SQLite
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Aplica o schema (tabelas + seed de categorias) sempre que o servidor sobe.
// CREATE TABLE IF NOT EXISTS e INSERT OR IGNORE tornam isso seguro em toda inicialização.
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

module.exports = db;