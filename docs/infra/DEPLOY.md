# Deploy e Rollback - ERP EVOK AUDIO

## Objetivo

Este fluxo padroniza o deploy do backend `server/` usando artefato Docker
imutavel, PostgreSQL local/isolado e rollback reproduzivel.

## Pre requisitos

- Docker e Docker Compose instalados.
- Banco PostgreSQL do projeto acessivel apenas no ambiente local ou homologado.
- Arquivo `.env` preenchido com `DB_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN` e `ADMIN_SEED_PASSWORD`.

## Build do artefato

Da raiz do repositorio:

```powershell
docker build -t erp-evok-audio-server:2026-07-31-g5 .\server
```

Nunca publique apenas `latest`. Use tag imutavel por data, release ou commit.

## Subida do banco

```powershell
docker compose up -d postgres
```

## Migrations antes do deploy

As migrations rodam fora da imagem final para manter o runtime enxuto:

```powershell
npm --prefix .\server ci
npm --prefix .\server run migration:up
```

## Deploy da API

```powershell
docker run -d `
  --name evok-api `
  --restart unless-stopped `
  --add-host host.docker.internal:host-gateway `
  -p 5000:5000 `
  -e NODE_ENV=production `
  -e PORT=5000 `
  -e DB_HOST=host.docker.internal `
  -e DB_PORT=5432 `
  -e DB_NAME=erp_evok_audio `
  -e DB_USER=evok_admin `
  -e DB_PASSWORD=SEU_SEGREDO `
  -e DB_SSL=true `
  -e DB_SSL_CA_PATH=C:\caminho\para\ca-postgres.pem `
  -e DB_LOGGING=false `
  -e JWT_SECRET=SEU_SEGREDO_FORTE `
  -e CORS_ORIGIN=https://seu-front.exemplo `
  -e ADMIN_SEED_PASSWORD=SEU_SEGREDO_FORTE `
  erp-evok-audio-server:2026-07-31-g5
```

## Validacao de healthcheck

```powershell
Invoke-WebRequest http://127.0.0.1:5000/health/live
Invoke-WebRequest http://127.0.0.1:5000/health/ready
docker ps
docker logs evok-api --tail 100
```

`/health/live` valida processo HTTP.
`/health/ready` valida processo + conectividade com o PostgreSQL.

## Rollback

1. Descobrir a ultima imagem aprovada.
2. Remover o container atual.
3. Subir novamente com a tag anterior.

```powershell
docker rm -f evok-api
docker run -d `
  --name evok-api `
  --restart unless-stopped `
  --add-host host.docker.internal:host-gateway `
  -p 5000:5000 `
  -e NODE_ENV=production `
  -e PORT=5000 `
  -e DB_HOST=host.docker.internal `
  -e DB_PORT=5432 `
  -e DB_NAME=erp_evok_audio `
  -e DB_USER=evok_admin `
  -e DB_PASSWORD=SEU_SEGREDO `
  -e DB_SSL=true `
  -e DB_SSL_CA_PATH=C:\caminho\para\ca-postgres.pem `
  -e DB_LOGGING=false `
  -e JWT_SECRET=SEU_SEGREDO_FORTE `
  -e CORS_ORIGIN=https://seu-front.exemplo `
  -e ADMIN_SEED_PASSWORD=SEU_SEGREDO_FORTE `
  erp-evok-audio-server:TAG_ANTERIOR_APROVADA
```

## Incidente operacional

Em caso de falha:

1. Coletar `docker logs evok-api --tail 200`.
2. Verificar `/health/ready`.
3. Confirmar conectividade com o banco.
4. Se necessario, executar rollback imediato.
5. Registrar horario, tag implantada, sintomas e causa presumida.

## Rotacao de secrets

Sempre que houver troca de operador, incidente ou suspeita de vazamento:

1. Gerar novos valores para `DB_PASSWORD`, `JWT_SECRET` e `ADMIN_SEED_PASSWORD`.
2. Atualizar `.env` do ambiente.
3. Reiniciar o container com a mesma imagem aprovada.
4. Validar novamente `/health/ready`.

## Observacao para Docker local

O exemplo acima e de producao e exige TLS no PostgreSQL. Para homologacao local
isolada via `docker compose`, use os valores do `docker-compose.yml`, onde o
PostgreSQL fica na rede interna do Compose e `NODE_ENV` nao deve ser
`production` sem certificado TLS configurado.
