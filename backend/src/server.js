require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db/connection");


const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({ mensagem: "API do Mural de Atividades funcionando!" });
});


// Monta apenas módulos que exportam um Express Router.
// Rotas ainda incompletas são ignoradas com um aviso no console.
function montarRota(caminho, modulo) {
  const router = require(modulo);
  if (typeof router !== "function") {
    console.warn(`Rota ${caminho} ignorada: ${modulo} não exporta um Express Router.`);
    return;
  }
  app.use(caminho, router);
}


montarRota("/auth", "./routes/auth.routes");
montarRota("/categorias", "./routes/categorias.routes");
montarRota("/atividades", "./routes/atividades.routes");
montarRota("/inscricoes", "./routes/inscricoes.routes");
// O router de interesses define seus próprios caminhos completos.
montarRota("/", "./routes/interesses.routes");


app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});


const PORTA = Number(process.env.PORT) || 3000;


async function iniciar() {
  try {
    // Confirma a conexão antes de informar que o servidor está disponível.
    await db.query("SELECT 1");
    app.listen(PORTA, () => {
      console.log(`Servidor rodando em http://localhost:${PORTA}`);
    });
  } catch (err) {
    console.error("Não foi possível conectar ao banco MySQL:", err.message);
    process.exitCode = 1;
  }
}


iniciar();
