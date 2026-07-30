# 🔐 Política de Segurança de Credenciais — ERP EVOK AUDIO

**Data**: 2026-07-30  
**Responsável**: Backend Engineer  
**Status**: ✅ Implementado

---

## ⚠️ REGRA CRÍTICA: NUNCA COMMITAR SENHAS NO GIT

Todas as credenciais (senhas, tokens, chaves) devem ser **GUARDADAS FORA DO REPOSITÓRIO**.

---

## Estrutura de Armazenamento Seguro

### Local: Seu Computador

```
C:\Users\{seu-usuario}\.erp-evok-secrets\
├── .env.local           (seu .env local com senhas REAIS)
├── .env.staging         (se usar staging)
├── .env.production      (se usar produção)
├── jwt-secret.key       (JWT secret para auth)
└── db-password.txt      (password PostgreSQL, só leitura)
```

**Permissões**:
```bash
# Linux/Mac
chmod 600 ~/.erp-evok-secrets/.env.*
chmod 600 ~/.erp-evok-secrets/*.key
chmod 600 ~/.erp-evok-secrets/*.txt

# Windows (PowerShell Admin)
$path = "C:\Users\{seu-usuario}\.erp-evok-secrets"
icacls $path /grant:r "$env:USERNAME`:F" /inheritance:r /t
```

### No Repositório: SEMPRE Use Placeholders

O arquivo `server/.env.example` (versionado) deve ter:

```env
# ❌ ERRADO - nunca fazer isso:
DB_PASSWORD=minha-senha-real-123

# ✅ CORRETO - usar placeholder:
DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD
JWT_SECRET=CHANGE_ME_USE_A_LONG_RANDOM_SECRET
ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION
```

---

## Fluxo de Configuração por Pessoa

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/gilwagno/ERP-Evok--Audio-LTDA.git
cd ERP-Evok--Audio-LTDA
```

### Passo 2: Crie o Diretório de Secrets

```bash
# Linux/Mac
mkdir -p ~/.erp-evok-secrets
chmod 700 ~/.erp-evok-secrets

# Windows (PowerShell)
New-Item -ItemType Directory -Path "$env:USERPROFILE\.erp-evok-secrets" -Force
```

### Passo 3: Copie e Preencha o .env Local

```bash
cp server/.env.example server/.env

# Editar server/.env com SUAS credenciais reais:
# DB_HOST=seu-servidor.com
# DB_PASSWORD=sua-senha-forte-real
# JWT_SECRET=seu-jwt-secret-aleatorio
# etc.
```

### Passo 4: Adicione ao .gitignore (já feito)

```bash
# Verificar que está no .gitignore
grep "^server/.env" .gitignore
# Esperado: server/.env

# Se não existir, adicionar:
echo "server/.env" >> .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
```

### Passo 5: Guarde Backup Seguro das Senhas

```bash
# Criar arquivo de referência (SEM o .env real)
cat > ~/.erp-evok-secrets/.env.backup-reference << 'EOF'
[2026-07-30] Credenciais do Servidor PostgreSQL
DB_HOST=seu-servidor.hostinger.com
DB_PORT=5432
DB_NAME=erp_evok_audio
DB_USER=evok_admin
DB_PASSWORD=[GUARDADO NO GERENCIADOR DE SENHAS]
DB_SSL=true
JWT_SECRET=[GUARDADO NO GERENCIADOR DE SENHAS]
ADMIN_SEED_PASSWORD=[GUARDADO NO GERENCIADOR DE SENHAS]

Notas:
- Criado em: 2026-07-30
- Máquina: {seu-hostname}
- Responsável: {seu-nome}
EOF

chmod 600 ~/.erp-evok-secrets/.env.backup-reference
```

---

## Gerenciadores de Senha Recomendados

### Pessoal / Desenvolvimento Local

- **1Password** — Sincroniza entre máquinas, suporta CLI
- **Bitwarden** — Open source, auto-hospedável
- **KeePass** — Standalone, arquivo local criptografado
- **macOS Keychain** — Nativo (Mac)
- **Windows Credential Manager** — Nativo (Windows)

### Exemplo: Armazenar em KeePass

```
KeePass Database: C:\Users\{user}\AppData\Local\erp-evok.kdbx

Entrada:
├── Title: ERP EVOK - PostgreSQL
├── Username: evok_admin
├── Password: [sua-senha-forte]
├── URL: postgresql://seu-servidor:5432/erp_evok_audio
└── Notes: |
    Criado: 2026-07-30
    Máquina: Meu Computador
    Backup: /path/to/backup
```

### Exemplo: Usar no Shell (Linux/Mac)

```bash
# Carregar senha do gerenciador
export DB_PASSWORD=$(security find-generic-password -w -a evok_admin -s "ERP EVOK DB")

# Ou com 1Password CLI
export DB_PASSWORD=$(op read "op://Private/ERP-Evok-DB/password")

# Usar
psql -h localhost -U evok_admin -d erp_evok_audio
```

---

## Checklist de Segurança Antes de Commitar

```bash
# 1. Verificar que .env NÃO foi adicionado ao stage
git status | grep -E "server/.env|^.env" || echo "✅ .env não está staged"

# 2. Verificar que .gitignore tem entries para .env
grep -E "^\.env|^server/\.env" .gitignore || echo "⚠️ Adicione ao .gitignore"

# 3. Procurar por padrões de senha no código (antes de commitar)
git diff --cached | grep -i "password\|secret\|token" | grep -v "CHANGE_ME" && \
  echo "⚠️ ALERTA: Possível credencial no diff!" || echo "✅ Nenhuma credencial detectada"

# 4. Verificar último commit (nunca deve ter senhas)
git log -1 -p | grep -i "password\|secret" | grep -v "CHANGE_ME" && \
  echo "⚠️ Último commit pode ter credencial!" || echo "✅ Último commit limpo"
```

---

## Se Acidentalmente Commitar uma Senha

### ⚠️ AÇÃO IMEDIATA

1. **Invalide a senha** no servidor (mudar password PostgreSQL, renovar JWT_SECRET)

2. **Remova do histórico git**:
```bash
# Opção 1: Revert (mais seguro)
git revert HEAD
git push

# Opção 2: Rebase (reescreve história - cuidado!)
git rebase -i HEAD~1
# Editar e remover a linha do commit

# Opção 3: BFG Repo-Cleaner (nuclear)
bfg --delete-files .env
```

3. **Notifique o time** (Slack, email, etc.)

4. **Gere novas credenciais**

---

## Estrutura Recomendada de Segredos

### .env.example (VERSIONADO)
```env
# Template com placeholders apenas
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_evok_audio
DB_USER=evok_admin
DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD
JWT_SECRET=CHANGE_ME_USE_A_LONG_RANDOM_SECRET
ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION
```

### .env (NÃO versionado, local)
```env
# Seu arquivo real com senhas REAIS
DB_HOST=seu-servidor.com
DB_PORT=5432
DB_NAME=erp_evok_audio
DB_USER=evok_admin
DB_PASSWORD=SenhaReal123!@#Segura
JWT_SECRET=AbC1De2fG3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f
ADMIN_SEED_PASSWORD=AdminPass456!@#Forte
```

---

## CI/CD (GitHub Actions, GitLab CI, etc.)

### Armazenar Secrets no GitHub

```bash
# Via CLI GitHub
gh secret set DB_PASSWORD
gh secret set JWT_SECRET
gh secret set ADMIN_SEED_PASSWORD

# Via UI: GitHub → Settings → Secrets and variables → Actions
```

### Usar no Workflow

```yaml
name: Deploy

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Create .env
        run: |
          cat > server/.env << EOF
          DB_HOST=${{ secrets.DB_HOST }}
          DB_PASSWORD=${{ secrets.DB_PASSWORD }}
          JWT_SECRET=${{ secrets.JWT_SECRET }}
          ADMIN_SEED_PASSWORD=${{ secrets.ADMIN_SEED_PASSWORD }}
          EOF
      
      - name: Deploy
        run: npm run deploy
```

---

## Audit Log de Credenciais

Para rastrear mudanças de senha:

```bash
# Arquivo local (PRIVADO)
cat > ~/.erp-evok-secrets/audit.log << 'EOF'
[2026-07-30 14:30] PostgreSQL password rotated by: Gilwagno
Antigo: (hash SHA256: abc123...)
Novo: (hash SHA256: def456...)
Reason: Initial setup for migration Phase 2
Location: localhost:5432, erp_evok_audio

[2026-07-30 15:00] JWT_SECRET regenerated
Reason: Development environment, no external users yet
EOF

chmod 600 ~/.erp-evok-secrets/audit.log
```

---

## Resumo da Política

| O QUÊ | ONDE | PERMITIDO? | EXEMPLOS |
|-------|------|-----------|----------|
| Senhas reais | `.env` local | ✅ SIM | `DB_PASSWORD=Abc123!` |
| Senhas reais | Git/GitHub | ❌ NÃO | Nunca commitar |
| Placeholders | `.env.example` | ✅ SIM | `DB_PASSWORD=CHANGE_ME` |
| Notas sobre credenciais | `.gitignore` protected files | ✅ SIM | `~/.erp-evok-secrets/` |
| Logs de auditoria | `.gitignore` protected files | ✅ SIM | `~/.erp-evok-secrets/audit.log` |
| JWT_SECRET | GitHub Secrets (CI/CD) | ✅ SIM | `${{ secrets.JWT_SECRET }}` |
| Passwords | Gerenciador de senha | ✅ SIM | 1Password, Bitwarden, KeePass |

---

**Contato**: Para dúvidas sobre segurança de credenciais, contacte o Backend Engineer.

