# xurras

Controle de pagamento para xurras de final de ano dos amigos.

## O que tem aqui

- Controle mensal de pagamentos de fevereiro a outubro.
- Status por participante e mes: `PG`, `AT`, `NP` ou vazio.
- Calculo automatico de saldo acumulado, pontos e brindes garantidos.
- Cadastro rapido de novos participantes.
- Dados salvos no navegador com `localStorage`.

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

## GitHub Pages

O app e estatico e roda direto no GitHub Pages. O workflow em `.github/workflows/pages.yml`
publica a branch `main` automaticamente.
