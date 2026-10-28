// Lógica JS da página login.html

(function () {
    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro");

    function lerCampos(form) {
        const dados = {};
        new FormData(form).forEach(function (valor, chave) {
            dados[chave] = typeof valor === "string" ? valor.trim() : valor;
        });
        return dados;
    }

    // Faz o login, guarda a sessão e leva o usuário para a página certa
    async function entrar(email, senha) {
        const resposta = await Api.chamar("/auth/login", {
            method: "POST",
            body: { email_institucional: email, senha: senha },
        });

        Api.salvarSessao(resposta.token, resposta.usuario);

        const params = new URLSearchParams(window.location.search);
        const destino = Api.destinoSeguro(params.get("next"));
        const padrao = resposta.usuario.papel === "responsavel" ? "/painel" : "/atividades";

        window.location.href = destino || padrao;
    }

    if (formLogin) {
        // Já está logado? Não precisa ver a tela de login de novo.
        if (Api.getToken() && Api.getUsuario()) {
            const usuario = Api.getUsuario();
            window.location.replace(usuario.papel === "responsavel" ? "/painel" : "/atividades");
            return;
        }

        formLogin.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            Api.limparMensagem();

            const dados = lerCampos(formLogin);
            const botao = formLogin.querySelector('button[type="submit"]');
            Api.bloquear(botao, true, "Entrando...");

            try {
                await entrar(dados.email_institucional, dados.senha);
            } catch (erro) {
                Api.mostrarMensagem(erro.message, "erro");
                Api.bloquear(botao, false);
            }
        });
    }

    if (formRegistro) {
        formRegistro.addEventListener("submit", async function (evento) {
            evento.preventDefault();
            Api.limparMensagem();

            const dados = lerCampos(formRegistro);

            if (dados.senha.length < 6) {
                Api.mostrarMensagem("A senha deve ter pelo menos 6 caracteres.", "erro");
                return;
            }

            const botao = formRegistro.querySelector('button[type="submit"]');
            Api.bloquear(botao, true, "Criando conta...");

            try {
                await Api.chamar("/auth/registrar", { method: "POST", body: dados });
            } catch (erro) {
                Api.mostrarMensagem(erro.message, "erro");
                Api.bloquear(botao, false);
                return;
            }

            // Conta criada: já entra direto, sem pedir para digitar tudo de novo
            try {
                await entrar(dados.email_institucional, dados.senha);
            } catch (erro) {
                window.location.href = "/login";
            }
        });
    }
})();
