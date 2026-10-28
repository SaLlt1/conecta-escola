import { describe, expect, it } from "vitest";
import { lerId, lerTexto } from "requisicao";

describe("lerId", () => {
  it("converte uma string de número inteiro positivo", () => {
    expect(lerId("42")).toBe(42);
  });

  it("aceita um número inteiro positivo", () => {
    expect(lerId(7)).toBe(7);
  });

  it("retorna null para zero", () => {
    expect(lerId("0")).toBeNull();
  });

  it("retorna null para número negativo", () => {
    expect(lerId("-3")).toBeNull();
  });

  it("retorna null para número decimal", () => {
    expect(lerId("2.5")).toBeNull();
  });

  it("retorna null para texto que não é número", () => {
    expect(lerId("abc")).toBeNull();
  });

  it("retorna null para query em formato de array", () => {
    expect(lerId(["4", "5"])).toBeNull();
  });
});

describe("lerTexto", () => {
  it("retorna o texto quando recebe uma string", () => {
    expect(lerTexto("busca")).toBe("busca");
  });

  it("retorna undefined para string vazia", () => {
    expect(lerTexto("")).toBeUndefined();
  });

  it("retorna undefined para número", () => {
    expect(lerTexto(123)).toBeUndefined();
  });

  it("retorna undefined para query em formato de array", () => {
    expect(lerTexto(["um", "dois"])).toBeUndefined();
  });

  it("retorna undefined para null", () => {
    expect(lerTexto(null)).toBeUndefined();
  });
});
