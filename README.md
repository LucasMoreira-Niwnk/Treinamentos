# Segurança em Foco · Casa & Terra

Portal em português para treinamento de segurança, avaliações e acompanhamento de conclusão.

## Login Google Workspace

O site valida a assinatura dos tokens do Google no servidor e exige que a claim `hd` corresponda a `casaeterra.com`. O e-mail sozinho não é usado para comprovar o domínio. As sessões usam cookie assinado, `HttpOnly` e `SameSite=Lax`.

Configure estas variáveis como valores de execução em Sites (não as adicione ao código-fonte):

- `GOOGLE_CLIENT_ID`: ID do cliente Web OAuth da aplicação Google.
- `GOOGLE_WORKSPACE_DOMAIN`: `casaeterra.com`.
- `SESSION_SECRET`: chave aleatória com pelo menos 32 caracteres.
- `ADMIN_EMAILS`: lista separada por vírgula dos gestores autorizados.

Crie o cliente OAuth como aplicação Web no Google Cloud Console e inclua a origem publicada do Site nas origens autorizadas de JavaScript. A tela de login do Google Identity Services recebe o token de identidade (flow nonce); o portal o valida com as chaves públicas oficiais do Google. Nenhum token Google é gravado no banco.

## Dados

D1 guarda usuários autenticados, cursos e notas. A taxa de conclusão usa os colaboradores que já entraram no portal como denominador; o Google Workspace não fornece aqui uma lista de todos os colaboradores sem acesso adicional ao diretório. Os cursos iniciais são conteúdo introdutório editável pela equipe gestora.

## Pré-visualização

O site precisa das tabelas criadas por `drizzle/`. No ambiente local, configure D1 de acordo com `.openai/hosting.json` antes de testar login, conclusões e métricas. A pré-visualização pode mostrar a tela inicial sem as credenciais de Google.
