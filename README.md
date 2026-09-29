# Segurança em Foco · Casa & Terra

Portal de treinamentos de segurança com login SAML pelo Google Workspace, cursos, avaliações e métricas de conclusão e nota. A versão de produção roda em Ubuntu com Node.js, Next.js e SQLite; os dados ficam em um arquivo persistente fora do código da aplicação.

## Requisitos

- Ubuntu 22.04 ou 24.04, com acesso SSH e `sudo`.
- Node.js 22.13 ou mais recente, npm e Git. O projeto usa `node:sqlite`; prefira uma versão LTS atual do Node instalada em um caminho fixo para o serviço systemd.
- Um domínio ou subdomínio apontado para o IP público do servidor.
- Portas 80 e 443 liberadas para o site; a porta 3000 fica acessível somente localmente.

## Configurar o SAML no Google Workspace

O Google Workspace atua como provedor de identidade (IdP); o portal é o provedor de serviço (SP). Não é necessário criar projeto no Google Cloud. No Admin Console, um superadministrador deve abrir **Apps > Web e dispositivos móveis > Adicionar app > Adicionar app SAML personalizado**. O Google exige perfil de superadministrador para criar esse tipo de app. [Instruções oficiais do Google](https://support.google.com/a/answer/6087519?hl=pt-BR).

1. Dê um nome ao app e avance até **Detalhes do provedor de identidade Google**. Copie o URL de SSO e o ID da entidade do IdP para `SAML_IDP_ENTRY_POINT` e `SAML_IDP_ISSUER`. Baixe o certificado do Google e copie-o para `/etc/ssl/casa-terra/google-workspace-idp.crt` no servidor.
2. Em **Detalhes do provedor de serviços**, use estes valores:

   | Campo | Valor |
   | --- | --- |
   | URL do ACS | `https://treinamentos.casaeterra.com/api/auth/saml/acs` |
   | ID da entidade | `https://treinamentos.casaeterra.com/saml/metadata` |
   | Formato do ID do nome | `EMAIL` ou `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
   | ID do nome | E-mail principal (Primary email) |

   O endereço de metadados do SP, se a tela aceitar importação de metadados, é `https://treinamentos.casaeterra.com/api/auth/saml/metadata`.
3. Finalize a criação e habilite o acesso do app para as unidades organizacionais ou grupos desejados. O portal também confere se o e-mail recebido termina em `@casaeterra.com`.
4. No servidor, crie `/etc/treinamentos/portal.env` com:

   ```dotenv
   GOOGLE_WORKSPACE_DOMAIN=casaeterra.com
   SESSION_SECRET=gere-uma-chave-aleatoria-com-pelo-menos-32-caracteres
   ADMIN_EMAILS=lucas.salomao@casaeterra.com,Uarlei.silva@casaeterra.com
   DATABASE_PATH=/var/lib/treinamentos/treinamentos.sqlite
   SAML_SP_ENTITY_ID=https://treinamentos.casaeterra.com/saml/metadata
   SAML_ACS_URL=https://treinamentos.casaeterra.com/api/auth/saml/acs
   SAML_IDP_ENTRY_POINT=COLE_AQUI_O_URL_DE_SSO_DO_GOOGLE
   SAML_IDP_ISSUER=COLE_AQUI_O_ID_DA_ENTIDADE_DO_GOOGLE
   SAML_IDP_CERT_PATH=/etc/ssl/casa-terra/google-workspace-idp.crt
   ```

   Gere o segredo com `openssl rand -hex 32`. Instale o certificado IdP do Google separado do `CeT.crt`/`CeT.key` do Nginx. Por exemplo, use proprietário `root`, grupo `treinamentos` e modo `0640` para o certificado, e mantenha o arquivo `portal.env` fora do Git com modo `0640`.

## Instalar no Ubuntu

Os comandos abaixo assumem que o repositório foi criado no GitHub e que Node.js LTS 22.13 ou mais recente está disponível em `/usr/bin/node`. No Ubuntu, a documentação do NodeSource apresenta a instalação LTS via APT. Depois confirme com `node -v`, `npm -v` e `command -v node`.

1. Instale os pacotes do sistema e crie as pastas:

   ```bash
   sudo apt update
   sudo apt install -y curl git nginx
   curl -fsSL https://deb.nodesource.com/setup_lts.x -o /tmp/nodesource_setup.sh
   sudo -E bash /tmp/nodesource_setup.sh
   sudo apt install -y nodejs
   node -v
   npm -v
   command -v node
   sudo adduser --system --group --home /var/lib/treinamentos --no-create-home treinamentos
   sudo install -d -o treinamentos -g treinamentos /opt/treinamentos
   sudo install -d -o treinamentos -g treinamentos /var/lib/treinamentos
   sudo install -d -o root -g treinamentos -m 0750 /etc/treinamentos
   ```

2. Clone o repositório em `/opt/treinamentos`. Para um repositório privado, configure uma chave de deploy do GitHub para o servidor antes do clone:

   ```bash
   sudo -u treinamentos git clone https://github.com/ORGANIZACAO/REPOSITORIO.git /opt/treinamentos
   ```

3. Configure `/etc/treinamentos/portal.env` conforme a seção SAML. Proteja o arquivo e configure o banco e o certificado do IdP:

   ```bash
   sudo chown root:treinamentos /etc/treinamentos/portal.env
   sudo chmod 0640 /etc/treinamentos/portal.env
   sudo chown root:treinamentos /etc/ssl/casa-terra/google-workspace-idp.crt
   sudo chmod 0640 /etc/ssl/casa-terra/google-workspace-idp.crt
   sudo chown -R treinamentos:treinamentos /var/lib/treinamentos
   ```

4. Instale as dependências, crie as tabelas e compile:

   ```bash
   cd /opt/treinamentos
   sudo -u treinamentos env HOME=/var/lib/treinamentos npm_config_cache=/var/lib/treinamentos/.npm npm ci
   sudo -u treinamentos bash -lc 'set -a; source /etc/treinamentos/portal.env; set +a; cd /opt/treinamentos; npm run db:migrate; npm run build'
   ```

5. Instale o serviço systemd de `deploy/treinamentos.service.example` como `/etc/systemd/system/treinamentos.service`. Confira se o caminho do Node no `ExecStart` é `/usr/bin/node`, depois habilite e inicie:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now treinamentos
   sudo systemctl status treinamentos
   ```

6. Copie `deploy/treinamentos.casaeterra.com.conf` para `/etc/nginx/sites-available/treinamentos.casaeterra.com` e habilite o site. Confirme que os arquivos de certificado e chave existem e que o Nginx tem permissão para lê-los:

   ```bash
   sudo install -m 0644 /opt/treinamentos/deploy/treinamentos.casaeterra.com.conf /etc/nginx/sites-available/treinamentos.casaeterra.com
   sudo ln -s /etc/nginx/sites-available/treinamentos.casaeterra.com /etc/nginx/sites-enabled/treinamentos.casaeterra.com
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   O DNS de `treinamentos.casaeterra.com` precisa apontar para o servidor. A renovação do certificado continua sob responsabilidade do processo que já administra esses certificados na VM.

## Atualizar uma versão

```bash
cd /opt/treinamentos
sudo -u treinamentos git pull --ff-only
sudo -u treinamentos env HOME=/var/lib/treinamentos npm_config_cache=/var/lib/treinamentos/.npm npm ci
sudo -u treinamentos bash -lc 'set -a; source /etc/treinamentos/portal.env; set +a; cd /opt/treinamentos; npm run db:migrate; npm run build'
sudo systemctl restart treinamentos
```

Faça cópias regulares de `/var/lib/treinamentos/treinamentos.sqlite`. Os arquivos `-wal` e `-shm` são auxiliares do SQLite; para backup consistente com o portal em uso, pare o serviço antes de copiar o banco.

## Desenvolvimento local

Copie `.env.example` para `.env`, preencha os dados IdP SAML, o certificado e o segredo da sessão. Para desenvolvimento local, o certificado IdP precisa estar disponível no caminho configurado. Depois execute `npm run db:migrate`, `npm run dev` e abra `http://localhost:3000`.
