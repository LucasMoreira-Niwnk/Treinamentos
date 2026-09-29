# Segurança em Foco · Casa & Terra

Portal de treinamentos de segurança com login Google Workspace, cursos, avaliações e métricas de conclusão. A versão de produção roda em Ubuntu com Node.js, Next.js e SQLite; os dados ficam em um arquivo persistente fora do código da aplicação.

## Requisitos

- Ubuntu 22.04 ou 24.04, com acesso SSH e `sudo`.
- Node.js 22.13 ou mais recente, npm e Git. O projeto usa `node:sqlite`; prefira uma versão LTS atual do Node instalada em um caminho fixo para o serviço systemd.
- Um domínio ou subdomínio apontado para o IP público do servidor.
- Portas 80 e 443 liberadas para o site; a porta 3000 fica acessível somente localmente.

## Configurar o login Google

No Google Cloud Console, crie um cliente OAuth do tipo **Aplicativo da Web**. Cadastre como origem JavaScript autorizada a URL final do portal, por exemplo `https://treinamentos.suaempresa.com.br`. Este login usa o fluxo do Google Identity Services e não precisa de uma URI de callback.

No servidor, crie `/etc/treinamentos/portal.env` com estas variáveis:

```dotenv
GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_WORKSPACE_DOMAIN=casaeterra.com
SESSION_SECRET=gere-uma-chave-aleatoria-com-pelo-menos-32-caracteres
ADMIN_EMAILS=lucas.salomao@casaeterra.com,Uarlei.silva@casaeterra.com
DATABASE_PATH=/var/lib/treinamentos/treinamentos.sqlite
```

Gere um segredo com `openssl rand -hex 32`. Mantenha esse arquivo fora do Git e restrinja sua leitura ao usuário do serviço.

## Instalar no Ubuntu

Os comandos abaixo assumem que o repositório foi criado no GitHub e que Node.js 22.13 ou mais recente está disponível em `/usr/bin/node`. Consulte a [página oficial de downloads do Node.js](https://nodejs.org/en/download) para instalar uma versão LTS compatível e confirme com `node -v`, `npm -v` e `command -v node`.

1. Instale os pacotes do sistema e crie as pastas:

   ```bash
   sudo apt update
   sudo apt install -y git nginx certbot python3-certbot-nginx
   sudo adduser --system --group --no-create-home treinamentos
   sudo install -d -o treinamentos -g treinamentos /opt/treinamentos
   sudo install -d -o treinamentos -g treinamentos /var/lib/treinamentos
   sudo install -d -o root -g treinamentos -m 0750 /etc/treinamentos
   ```

2. Clone o repositório em `/opt/treinamentos`. Para um repositório privado, configure uma chave de deploy do GitHub para o servidor antes do clone:

   ```bash
   sudo -u treinamentos git clone https://github.com/ORGANIZACAO/REPOSITORIO.git /opt/treinamentos
   ```

3. Crie `/etc/treinamentos/portal.env` com os valores da seção de login. Proteja o arquivo e configure o banco:

   ```bash
   sudo chown root:treinamentos /etc/treinamentos/portal.env
   sudo chmod 0640 /etc/treinamentos/portal.env
   sudo chown -R treinamentos:treinamentos /var/lib/treinamentos
   ```

4. Instale as dependências, crie as tabelas e compile:

   ```bash
   cd /opt/treinamentos
   sudo -u treinamentos npm ci
   sudo -u treinamentos bash -lc 'set -a; source /etc/treinamentos/portal.env; set +a; cd /opt/treinamentos; npm run db:migrate; npm run build'
   ```

5. Instale o serviço systemd de `deploy/treinamentos.service.example` como `/etc/systemd/system/treinamentos.service`. Confira se o caminho do Node no `ExecStart` é `/usr/bin/node`, depois habilite e inicie:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now treinamentos
   sudo systemctl status treinamentos
   ```

6. Copie `deploy/nginx-site.conf.example` para `/etc/nginx/sites-available/treinamentos`, substitua `treinamentos.exemplo.com.br` pelo domínio real, habilite o site e obtenha o certificado TLS:

   ```bash
   sudo ln -s /etc/nginx/sites-available/treinamentos /etc/nginx/sites-enabled/treinamentos
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d treinamentos.suaempresa.com.br
   ```

   O DNS do domínio precisa apontar para o servidor antes de solicitar o certificado.

## Atualizar uma versão

```bash
cd /opt/treinamentos
sudo -u treinamentos git pull --ff-only
sudo -u treinamentos npm ci
sudo -u treinamentos bash -lc 'set -a; source /etc/treinamentos/portal.env; set +a; cd /opt/treinamentos; npm run db:migrate; npm run build'
sudo systemctl restart treinamentos
```

Faça cópias regulares de `/var/lib/treinamentos/treinamentos.sqlite`. Os arquivos `-wal` e `-shm` são auxiliares do SQLite; para backup consistente com o portal em uso, pare o serviço antes de copiar o banco.

## Desenvolvimento local

Copie `.env.example` para `.env`, preencha `GOOGLE_CLIENT_ID` e o segredo da sessão, depois execute `npm run db:migrate`, `npm run dev` e abra `http://localhost:3000`.
