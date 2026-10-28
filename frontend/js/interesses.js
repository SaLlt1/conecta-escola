// Lógica JS da página interesses.html

(function () {
    const form = document.getElementById("form-interesses");
    const listaAgregados = document.getElementById("interesses-agregados");
    if (!form && !listaAgregados) return;

    const usuario = Api.exigirLogin();
    if (!usuario) return;

    const CHAVE_LOCAL = "conecta_interesses_" + usuario.id;

    function lerSalvos() {
        try {
            return new Set(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "[]"));
        } catch (e) {
            return new Set();
        }
    }

    function guardarSalvos(categorias) {
        try {
            localStorage.setItem(CHAVE_LOCAL, JSON.stringify(categorias.map(function (c) { return c.id; })));
        } catch (e) {}
    }

    // ---------- Escolha de interesses (aluno e responsável) ----------

    async function iniciarFormulario() {
        const lista = document.getElementById("lista-interesses");
        if (!lista) return;

        try {
            const categorias = await Api.chamar("/categorias");
            const salvos = lerSalvos();

            lista.replaceChildren();
            categorias.forEach(function (categoria) {
                const rotulo = Api.criar("label", "campo");
                const caixa = document.createElement("input");
                caixa.type = "checkbox";
                caixa.name = "categorias";
                caixa.value = categoria.id;
                caixa.checked = salvos.has(categoria.id);

                rotulo.appendChild(caixa);
                rotulo.appendChild(document.createTextNode(" " + categoria.nome));
                lista.appendChild(rotulo);
            });
        } catch (erro) {
            Api.mostrarMensagem(erro.message, "erro");
            return;
        }

        form.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            Api.limparMensagem();

            const marcadas = Array.from(form.querySelectorAll('input[name="categorias"]:checked')).map(
                function (caixa) { return Number(caixa.value); }
            );

            if (marcadas.length === 0) {
                Api.mostrarMensagem("Selecione pelo menos um interesse.", "erro");
                return;
            }

            const botao = form.querySelector('button[type="submit"]');
            Api.bloquear(botao, true, "Salvando...");

            try {
                const atualizados = await Api.chamar("/meus-interesses", {
                    method: "PUT",
                    body: { categorias: marcadas },
                });
                guardarSalvos(atualizados);
                Api.mostrarMensagem("Interesses salvos! O mural agora mostra primeiro o que combina com você.", "sucesso");
            } catch (erro) {
                Api.mostrarMensagem(erro.message, "erro");
                if (erro.status === 401) Api.exigirLogin();
            } finally {
                Api.bloquear(botao, false);
            }
        });
    }

    // ---------- Interesses agregados (só responsável) ----------
    // A API só devolve categorias com número mínimo de interessados, sem identificar nenhum aluno.

    async function iniciarAgregados() {
        if (!listaAgregados) return;

        if (usuario.papel !== "responsavel") {
            listaAgregados.hidden = true;
            return;
        }

        try {
            const dados = await Api.chamar("/interesses/agregados");
            listaAgregados.replaceChildren();

            if (dados.length === 0) {
                listaAgregados.appendChild(
                    Api.criar("p", "", "Ainda não há interessados suficientes para exibir estatísticas.")
                );
                return;
            }

            const ul = Api.criar("ul", "lista");
            dados.forEach(function (item) {
                const li = Api.criar("li", "lista-item");
                const texto = Api.criar("div");
                texto.appendChild(Api.criar("h3", "", item.categoria));
                texto.appendChild(
                    Api.criar("p", "", item.total_interessados + " interessados · " + item.total_atividades + " atividade(s) ativa(s)")
                );
                li.appendChild(texto);

                if (item.sem_atividade_correspondente) {
                    li.appendChild(Api.criar("span", "badge badge-lotada", "Sem atividade"));
                }
                ul.appendChild(li);
            });
            listaAgregados.appendChild(ul);
        } catch (erro) {
            Api.mostrarMensagem(erro.message, "erro");
        }
    }

    if (form) iniciarFormulario();
    iniciarAgregados();
})();
