import "dotenv/config";

// Garante que variáveis obrigatórias existem e dá a elas o tipo `string`
// (process.env.X é sempre `string | undefined` no TypeScript).
function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida. Confira o arquivo .env`);
  }
  return valor;
}

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: obrigatoria("JWT_SECRET"),
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: process.env.DB_NAME || "mural_atividades",
  DOMINIO_INSTITUCIONAL: process.env.DOMINIO_INSTITUCIONAL || null,
};