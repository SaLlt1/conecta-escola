// Funções centrais de chamada à API (fetch), usadas por todas as páginas

const Api = (function () {
    const CHAVE_TOKEN = "conecta_token";
    const CHAVE_USUARIO = "conecta_usuario";

    // ---------- Sessão (token JWT + dados básicos do usuário) ----------

    function lerStorage(chave) {
        try {
            return localStorage.getItem(chave);
        } catch (e) {
            return null;
        }
    }

    function getToken() {
        return lerStorage(CHAVE_TOKEN);
    }

    function getUsuario() {
        const texto = lerStorage(CHAVE_USUARIO);
        if (!texto) return null;
        try {
            return JSON.parse(texto);
        } catch (e) {
            return null;
        }
    }

    function salvarSessao(token, usuario) {
        try {
            localStorage.setItem(CHAVE_TOKEN, token);
            localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
        } catch (e) {
            // storage bloqueado: o login não persiste, mas a página não quebra
        }
    }

    function limparSessao() {
        try {
            localStorage.removeItem(CHAVE_TOKEN);
            localStorage.removeItem(CHAVE_USUARIO);
        } catch (e) {}
    }

    function sair() {
        limparSessao();
        window.location.href = "/login";
    }

    // Só aceita caminhos internos (evita redirecionar para outro site via ?next=)
    function destinoSeguro(destino) {
        if (typeof destino === "string" && destino.startsWith("/") && !destino.startsWith("//")) {
            return destino;
        }
        return null;
    }

    function irParaLogin() {
        const atual = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(atual);
    }

    // Exige login (e, opcionalmente, um papel). Retorna o usuário, ou null
    // se redirecionou — nesse caso a página deve parar o que estava fazendo.
    function exigirLogin(papel) {
        const usuario = getUsuario();
        if (!getToken() || !usuario) {
            irParaLogin();
            return null;
        }
        if (papel && usuario.papel !== papel) {
            return { negado: true, usuario: usuario };
        }
        return usuario;
    }

    // ---------- Requisições ----------

    // Chama a API. `opcoes`: { method, body }. Sempre manda o token, se houver.
    // Em caso de erro lança Error com `.status` e a mensagem vinda do backend.
    async function chamar(caminho, opcoes) {
        opcoes = opcoes || {};
        const headers = {};
        const token = getToken();

        if (token) headers["Authorization"] = "Bearer " + token;
        if (opcoes.body !== undefined) headers["Content-Type"] = "application/json";

        let resposta;
        try {
            resposta = await fetch("/api" + caminho, {
                method: opcoes.method || "GET",
                headers: headers,
                body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
            });
        } catch (e) {
            const erro = new Error("Não foi possível conectar ao servidor. Tente novamente.");
            erro.status = 0;
            throw erro;
        }

        // 204 (ex.: desistir da inscrição) não tem corpo
        let dados = null;
        if (resposta.status !== 204) {
            try {
                dados = await resposta.json();
            } catch (e) {
                dados = null;
            }
        }

        if (!resposta.ok) {
            // Token expirado/inválido: limpa a sessão para o usuário logar de novo
            if (resposta.status === 401 && token) limparSessao();
            const erro = new Error((dados && dados.erro) || "Erro ao processar a requisição.");
            erro.status = resposta.status;
            throw erro;
        }

        return dados;
    }

    // ---------- Mensagens na tela (#mensagem) ----------

    // tipo: "erro" | "sucesso" | "info"
    function mostrarMensagem(texto, tipo) {
        const caixa = document.getElementById("mensagem");
        if (!caixa) return;
        caixa.className = "mensagem mensagem-" + (tipo || "erro");
        caixa.textContent = texto;
    }

    function limparMensagem() {
        const caixa = document.getElementById("mensagem");
        if (!caixa) return;
        caixa.textContent = "";
    }

    // ---------- Pequenos utilitários de DOM ----------

    // criar("span", "badge", "texto") — usa textContent, então nunca interpreta HTML
    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined && texto !== null) elemento.textContent = texto;
        return elemento;
    }

    function bloquear(botao, bloqueado, textoOcupado) {
        if (!botao) return;
        if (bloqueado) {
            botao.dataset.textoOriginal = botao.textContent;
            if (textoOcupado) botao.textContent = textoOcupado;
        } else if (botao.dataset.textoOriginal) {
            botao.textContent = botao.dataset.textoOriginal;
        }
        botao.disabled = bloqueado;
    }

    // ---------- Navegação: ajusta o menu conforme quem está logado ----------

    function atualizarNav() {
        const nav = document.querySelector("header nav");
        if (!nav) return;

        const usuario = getUsuario();
        const logado = !!(getToken() && usuario);

        const linkPainel = nav.querySelector('a[href="/painel"]');
        const linkInscricoes = nav.querySelector('a[href="/inscricoes"]');
        const linkLogin = nav.querySelector('a[href="/login"]');

        // Painel só para responsáveis; "Minhas inscrições" só para alunos
        if (linkPainel && !(logado && usuario.papel === "responsavel")) linkPainel.hidden = true;
        if (linkInscricoes && logado && usuario.papel === "responsavel") linkInscricoes.hidden = true;

        // Login vira "Sair (Nome)" quando há sessão
        if (linkLogin && logado) {
            const primeiroNome = String(usuario.nome || "").split(" ")[0];
            linkLogin.textContent = primeiroNome ? "Sair (" + primeiroNome + ")" : "Sair";
            linkLogin.href = "#";
            linkLogin.classList.remove("ativo");
            linkLogin.addEventListener("click", function (evento) {
                evento.preventDefault();
                sair();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", atualizarNav);

    return {
        getToken: getToken,
        getUsuario: getUsuario,
        salvarSessao: salvarSessao,
        limparSessao: limparSessao,
        sair: sair,
        destinoSeguro: destinoSeguro,
        exigirLogin: exigirLogin,
        chamar: chamar,
        mostrarMensagem: mostrarMensagem,
        limparMensagem: limparMensagem,
        criar: criar,
        bloquear: bloquear,
    };
})();
