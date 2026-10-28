import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";

import { env } from "./config/env";
import db from "./db/connection";
import { lerTexto } from "./utils/requisicao";
import type { Atividade, Categoria, Linha } from "./types";

import authRoutes from "./routes/auth.routes";
import categoriasRoutes from "./routes/categorias.routes";
import atividadesRoutes from "./routes/atividades.routes";
import inscricoesRoutes from "./routes/inscricoes.routes";
import interessesRoutes from "./routes/interesses.routes";

const app = express();

// Configurações gerais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do EJS
// (funciona tanto rodando src/server.ts quanto dist/server.js: os dois ficam
// na mesma profundidade, então "../../frontend" aponta para a mesma pasta)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../../frontend/views"));

// Arquivos estáticos: CSS, JavaScript e imagens
app.use(express.static(path.join(__dirname, "../../frontend")));

// ---------- API (JSON) ----------
app.use("/api/auth", authRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/atividades", atividadesRoutes);
app.use("/api/inscricoes", inscricoesRoutes);
app.use("/api", interessesRoutes);

// ---------- Páginas (EJS) ----------

// Consultar banco de dados sem derrubar a página se o MySQL estiver indisponível
async function consultar<T>(sql: string, params: unknown[] = []): Promise<Linha<T>[]> {
  try {
    const [linhas] = await db.query<Linha<T>[]>(sql, params);
    return linhas;
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error("Erro ao consultar o banco:", mensagem);
    return [];
  }
}

type AtividadeMural = Atividade & {
  categoria_nome: string;
  responsavel_nome: string | null;
  inscritos: number;
  em_espera: number;
};

const SQL_ATIVIDADE = `
    SELECT
        atividade.*,
        categoria.nome AS categoria_nome,
        usuario.nome AS responsavel_nome,
        (
            SELECT COUNT(*)
            FROM inscricao
            WHERE inscricao.atividade_id = atividade.id
              AND inscricao.status = 'confirmada'
        ) AS inscritos,
        (
            SELECT COUNT(*)
            FROM inscricao
            WHERE inscricao.atividade_id = atividade.id
              AND inscricao.status = 'espera'
        ) AS em_espera
    FROM atividade
    JOIN categoria ON categoria.id = atividade.categoria_id
    LEFT JOIN usuario ON usuario.id = atividade.responsavel_id
`;

function comVagas(a: AtividadeMural) {
  return {
    ...a,
    vagas_disponiveis: Math.max(a.vagas - (a.inscritos || 0), 0),
  };
}

// Página inicial
app.get("/", (req, res) => {
  res.render("index");
});

// Login
app.get("/login", (req, res) => {
  res.render("auth/login");
});

// Registro
app.get("/registro", (req, res) => {
  res.render("auth/registro");
});

// Mural de atividades
app.get("/atividades", async (req, res) => {
  const categoria = lerTexto(req.query.categoria);
  const busca = lerTexto(req.query.busca);

  let sql = SQL_ATIVIDADE + " WHERE atividade.status = 'ativa'";
  const params: unknown[] = [];

  if (categoria) {
    sql += " AND atividade.categoria_id = ?";
    params.push(Number(categoria));
  }

  if (busca) {
    sql += " AND atividade.nome LIKE ?";
    params.push(`%${busca}%`);
  }

  sql += " ORDER BY atividade.id DESC";

  const atividades = (await consultar<AtividadeMural>(sql, params)).map(comVagas);
  const categorias = await consultar<Categoria>("SELECT id, nome FROM categoria ORDER BY nome");

  res.render("atividades/listar", {
    atividades,
    categorias,
    categoriaSelecionada: categoria || "",
    busca: busca || "",
  });
});

// Nova atividade
app.get("/atividades/nova", async (req, res) => {
  const categorias = await consultar<Categoria>("SELECT id, nome FROM categoria ORDER BY nome");

  res.render("atividades/form", { categorias });
});

// Detalhes da atividade
app.get("/atividades/:id", async (req, res, next) => {
  const [atividade] = await consultar<AtividadeMural>(SQL_ATIVIDADE + " WHERE atividade.id = ?", [
    req.params.id,
  ]);

  if (!atividade) {
    next();
    return;
  }

  res.render("atividades/detalhes", {
    atividade: comVagas(atividade),
  });
});

// Editar atividade
app.get("/atividades/:id/editar", async (req, res, next) => {
  const [atividade] = await consultar<Atividade>("SELECT * FROM atividade WHERE id = ?", [
    req.params.id,
  ]);

  if (!atividade) {
    next();
    return;
  }

  const categorias = await consultar<Categoria>("SELECT id, nome FROM categoria ORDER BY nome");

  res.render("atividades/form", {
    atividade,
    categorias,
  });
});

// Minhas inscrições
app.get("/inscricoes", (req, res) => {
  res.render("inscricoes/listar");
});

// Painel
app.get("/painel", (req, res) => {
  res.render("painel/index");
});

// Página não encontrada
app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

// Tratamento de erros: qualquer next(err) das rotas cai aqui
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

// Iniciar servidor
app.listen(env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${env.PORT}`);
});