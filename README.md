# xurras

Controle de pagamento para xurras de final de ano dos amigos.

## O que tem aqui

- Controle mensal de pagamentos de fevereiro a outubro.
- Status por participante e mes: `PG`, `AT`, `NP` ou vazio.
- Calculo automatico de saldo acumulado, pontos e brindes garantidos.
- Cadastro rapido de novos participantes (somente no modo edicao).
- Pagina publica e somente leitura. A fonte de dados e o `data.json` versionado no repo.

## Rodando localmente

Abra `index.html` no navegador ou use o servidor estatico do Node:

```sh
npm run dev
```

Depois acesse `http://localhost:4173`.

## Testes

```sh
npm test
```

## Editando os dados (so o dono)

A pagina e somente leitura para qualquer visitante. Os dados vivem em `data.json`,
versionado no repositorio. O que tranca a edicao e um token do GitHub, nao a URL:
sem um token com acesso de escrita a este repo, a pagina e pura leitura para qualquer um.

### Setup unico: criar o token (~3 min)

1. Acesse <https://github.com/settings/personal-access-tokens/new> (Fine-grained token).
2. Em **Repository access**, escolha **Only select repositories** e selecione `xurras`.
3. Em **Permissions > Repository permissions**, defina **Contents** como **Read and write**.
4. Gere o token e copie (comeca com `github_pat_...`).

### Editando (do celular ou de qualquer lugar)

1. Na pagina publica, toque no link discreto no rodape (ou va direto em
   `https://tuliofergulha.github.io/xurras/admin.html`).
2. Cole o token e toque em **Entrar**. Ele fica salvo so neste aparelho (`localStorage`);
   nas proximas vezes a pagina admin ja abre direto no editor, sem pedir o token de novo.
3. Toque nas celulas para alternar `PG` / `AT` / `NP` / vazio, ajuste a mensalidade e
   adicione participantes. As alteracoes ficam num rascunho local ate publicar.
4. Toque em **Salvar e publicar**. A pagina commita o `data.json` via API do GitHub e o
   site atualiza em ~1 min para todo mundo.

- **Descartar**: joga fora o rascunho local e recarrega o que esta publicado.
- **Sair**: remove o token deste aparelho.

> O token nunca sai do seu dispositivo e nao vai para o repositorio. Use um Fine-grained
> token limitado ao repo `xurras`; se vazar, revogue em GitHub > Settings > Tokens.

## GitHub Pages

O app e estatico e roda direto no GitHub Pages. O workflow em `.github/workflows/pages.yml`
publica a branch `main` automaticamente.
