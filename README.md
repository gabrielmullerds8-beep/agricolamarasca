# Agrícola Marasca — Vendas e rentabilidade

Aplicativo para consolidar semanalmente as planilhas `Venda x Custo por nota`, recalcular os indicadores e apresentar o painel comercial em duas áreas: **Visão geral** e **Base de dados**.

## O que está pronto

- Dashboard com vendas, custo, resultado real, margem, clientes e documentos.
- Comparação da última semana fechada com a semana anterior.
- Evolução mensal e semanal, concentração de clientes e produtos, resumo mensal e desvios da tabela de preços.
- Importação incremental de `.xls` e `.xlsx` no formato original, com prevenção de duplicidades.
- Inclusão e exclusão manual de registros.
- Modo local com a base de 30/09/2026 e persistência no navegador.
- Integração com Supabase Auth e banco protegido por RLS.

## Executar localmente

```bash
pnpm install
pnpm dev
```

Sem variáveis do Supabase, o aplicativo inicia em modo de demonstração local usando `public/seed-sales.json`.

## Configurar o Supabase

1. Crie um projeto no Supabase.
2. Execute a migração em `supabase/migrations` pelo fluxo do Supabase CLI ou pelo SQL Editor.
3. Em **Authentication > Users**, crie o usuário autorizado com e-mail e senha.
4. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
NEXT_PUBLIC_AUTH_ENABLED=true
```

5. Reinicie o servidor, entre com o usuário criado e importe a planilha inicial.

As políticas da migração permitem que cada usuário autenticado consulte e altere somente os próprios registros. Enquanto `NEXT_PUBLIC_AUTH_ENABLED=false`, o aplicativo permanece em modo público de demonstração e não grava no Supabase. Defina a variável como `true` quando os usuários estiverem cadastrados. A chave secreta/service role nunca deve ser exposta no navegador.

## Publicar no GitHub e na Vercel

1. Crie um repositório no GitHub e envie este projeto.
2. Importe o repositório na Vercel.
3. Cadastre as duas variáveis de ambiente acima nos ambientes desejados.
4. Faça o deploy. A Vercel detectará o Next.js automaticamente.

## Formato esperado da planilha

O importador lê a primeira aba e espera o mesmo formato do arquivo fornecido: linhas de cabeçalho iniciadas por `Nota:` seguidas pelos itens com 18 colunas, incluindo produto, quantidade, venda, custo, lucro e diferenças da tabela.
