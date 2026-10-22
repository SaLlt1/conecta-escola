
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db/connection");
const categoriasRoutes = require("./routes/categorias.routes");

const app = express();

// Configurações gerais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../../frontend/views"));

// Arquivos estáticos: CSS, JavaScript e imagens
app.use(express.static(path.join(__dirname, "../../frontend")));

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

// Rotas de categorias
app.use("/categorias", categoriasRoutes);

// Consultar banco de dados sem derrubar a página se o MySQL estiver indisponível
async function consultar(sql, params = []) {
    try {
        const [linhas] = await db.query(sql, params);
        return linhas;
    } catch (err) {
        console.error("Erro ao consultar o banco:", err.message);
        return [];
    }
}

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

function comVagas(a) {
    return {
        ...a,
        vagas_disponiveis: Math.max(a.vagas - (a.inscritos || 0), 0)
    };
}

// Mural de atividades
app.get("/atividades", async (req, res) => {
    const { categoria, busca } = req.query;

    let sql = SQL_ATIVIDADE + " WHERE atividade.status = 'ativa'";
    const params = [];

    if (categoria) {
        sql += " AND atividade.categoria_id = ?";
        params.push(Number(categoria));
    }

    if (busca) {
        sql += " AND atividade.nome LIKE ?";
        params.push(`%${busca}%`);
    }

    sql += " ORDER BY atividade.id DESC";

    const atividades = (await consultar(sql, params)).map(comVagas);
    const categorias = await consultar(
        "SELECT id, nome FROM categoria ORDER BY nome"
    );

    res.render("atividades/listar", {
        atividades,
        categorias,
        categoriaSelecionada: categoria || "",
        busca: busca || ""
    });
});

// Nova atividade
app.get("/atividades/nova", async (req, res) => {
    const categorias = await consultar(
        "SELECT id, nome FROM categoria ORDER BY nome"
    );

    res.render("atividades/form", { categorias });
});

// Detalhes da atividade
app.get("/atividades/:id", async (req, res, next) => {
    const [atividade] = await consultar(
        SQL_ATIVIDADE + " WHERE atividade.id = ?",
        [req.params.id]
    );

    if (!atividade) {
        return next();
    }

    res.render("atividades/detalhes", {
        atividade: comVagas(atividade)
    });
});

// Editar atividade
app.get("/atividades/:id/editar", async (req, res, next) => {
    const [atividade] = await consultar(
        "SELECT * FROM atividade WHERE id = ?",
        [req.params.id]
    );

    if (!atividade) {
        return next();
    }

    const categorias = await consultar(
        "SELECT id, nome FROM categoria ORDER BY nome"
    );

    res.render("atividades/form", {
        atividade,
        categorias
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

// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
