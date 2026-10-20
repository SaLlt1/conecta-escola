require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db/db'); // garante que o banco e as tabelas existem antes de subir

const categoriasRoutes = require('./routes/categorias.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', servico: 'mural-atividades-backend' });
});

app.use(categoriasRoutes);
// proximas rotas entram aqui: auth, meus-interesses, atividades, inscricoes...

app.use((req, res) => {
  res.status(404).json({ erro: 'rota nao encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});