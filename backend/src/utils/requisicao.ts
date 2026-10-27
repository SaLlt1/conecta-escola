// req.params / req.query chegam como string (ou array/objeto no caso de query).
// Estas funções convertem para o tipo que o código realmente espera.

// Converte um parâmetro de rota em id numérico positivo. Retorna null se for inválido.
export function lerId(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Pega um valor de query string só se for um texto não vazio.
export function lerTexto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}