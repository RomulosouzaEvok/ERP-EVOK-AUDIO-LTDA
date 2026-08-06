# Evok Áudio — Painel de TV (Android TV)

App **separado** de `mobile/` (celular). Este é um painel "placar" para
Android TV / Fire TV Box: login uma única vez no aparelho, e a partir daí
fica sempre visível na parede, mostrando as demandas em aberto (Ordens de
Produção, Requisições de Compra, Contagens de Inventário) de cada
departamento, atualizando sozinho a cada 60 segundos. Navegação por
controle remoto (D-pad), texto grande, "10-foot UI", sem toque.

Consome o mesmo backend Node.js/Express do ERP (`server/`) — **não altera o
backend**. Endpoints usados:
- `POST /api/auth/login` (mesmo contrato JWT do app mobile)
- `GET /api/dashboard/department-demands` (ver `docs/arquitetura/API.md`, seção "14. Dashboard / Painel de TV")

---

## 1. Abordagem técnica escolhida (e por quê)

Expo Go **não roda em Android TV** — não há app na Play Store de TV, e o
runtime do Expo Go não inclui os módulos nativos de foco/D-pad. Seguimos ao
pé da letra o guia oficial atual da Expo para TV, **"Building Expo apps for
TV"** (https://docs.expo.dev/guides/building-for-tv/, conferido nesta
sessão em 2026-08-06 — não é um caminho inferido de memória, o conteúdo
exato do guia foi lido antes de implementar):

1. **`react-native-tvos`** (fork de `react-native` mantido pela comunidade
   `react-native-tvos`/`callstack`, com suporte nativo a Android TV e tvOS —
   foco/D-pad, `TVFocusGuideView`, `hasTVPreferredFocus`, banner/launcher de
   TV) **aliasado** no lugar do `react-native` padrão, via `package.json`
   (é exatamente a receita "Modify dependencies for TV" do guia oficial,
   ramo "SDK 56 and later" — nosso projeto está em Expo SDK `~57.0.11`, que
   não precisa do campo extra `expo.install.exclude` exigido só em SDK 55 e
   anteriores):
   ```json
   "dependencies": {
     "react-native": "npm:react-native-tvos@0.86.2-0"
   }
   ```
   A versão `0.86.2-0` foi escolhida por espelhar **exatamente** a versão
   `0.86.2` do `react-native` usada em `mobile/` — o fork `-tvos` publica
   builds numeradas para casar com cada versão upstream do React Native, e é
   preciso usar a que corresponde à versão que o Expo SDK instalado espera.
2. **`@react-native-tvos/config-tv`** — o config plugin oficial do mesmo
   projeto `react-native-tvos`, instalado como dev dependency e registrado
   em `app.json` → `plugins`. Ele é quem efetivamente modifica o projeto
   nativo gerado pelo `expo prebuild` para virar um app de TV (categoria de
   launcher Leanback, `android.hardware.touchscreen required="false"`,
   `android.software.leanback`, etc.) — ativado quando a variável de
   ambiente `EXPO_TV=1` está definida no momento do `expo prebuild`.
3. **Dev client / build nativa própria**, não Expo Go — porque qualquer
   módulo nativo fora do runtime padrão do Expo Go (aqui, `react-native-tvos`
   inteiro) exige gerar um APK próprio. O fluxo é: `EXPO_TV=1 npx expo
   prebuild --clean` (gera `android/`, CNG — continuous native generation),
   seguido de `EXPO_TV=1 npx expo run:android` (build local, requer Android
   SDK) **ou** EAS Build na nuvem com um profile que define `EXPO_TV=1` (não
   requer Android SDK local) — ambos documentados na seção 3.
4. Mantido o padrão de projeto do `mobile/` (Expo Router para as poucas
   rotas, `expo-secure-store` para persistir o JWT, mesmo `src/api/client.ts`
   de tratamento de erro) — reaproveitado, não reinventado, por instrução
   explícita.

### O que foi de fato validado neste ambiente headless
Este ambiente de desenvolvimento é **headless** (sem Android SDK completo
com build-tools/NDK, sem emulador de Android TV, sem hardware físico
conectado) — não é possível rodar `expo run:android`/instalar e visualizar o
app renderizado numa TV real nesta sessão. Ainda assim, foi possível ir
além do JS puro e confirmar a etapa nativa central do guia:

- `npx tsc --noEmit` — **sem erros** (typecheck completo do projeto).
- `npx expo export --platform android` — **bundle Metro gerado com sucesso**
  (1712 módulos, `.hbc` de ~2.6-3.3MB), confirmando que todo o JS/TSX
  compila e resolve corretamente com `react-native-tvos` aliasado no lugar
  do `react-native` padrão.
- `EXPO_TV=1 npx expo prebuild --platform android --clean` — **executado de
  verdade nesta sessão** (gera só as pastas nativas, não requer Android SDK)
  e o `android/app/src/main/AndroidManifest.xml` resultante foi inspecionado
  e confirma a configuração de TV esperada:
  ```xml
  <uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
  <uses-feature android:name="android.software.leanback" android:required="false"/>
  ...
  <category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
  ```
  Ou seja, o `@react-native-tvos/config-tv` plugin está funcionando
  corretamente neste projeto. A pasta `android/` gerada foi removida após a
  validação (é conteúdo gerado por CNG, não deve ser versionado — está no
  `.gitignore`, mesmo padrão de apps bare/prebuild do Expo).

O que **não** foi (e não pôde ser) validado aqui — por exigir Android
SDK/emulador/hardware real — está listado na seção 5.

---

## 2. Estrutura de pastas

```
tv/
├── app/                        # Rotas (Expo Router)
│   ├── _layout.tsx             # Stack raiz + AuthProvider
│   ├── index.tsx                # Decide login vs dashboard conforme sessão salva
│   ├── login.tsx                # Tela de login (10-foot UI, D-pad)
│   └── (app)/
│       ├── _layout.tsx          # Guarda de rota autenticada
│       └── dashboard.tsx        # Painel principal (grade de cards por departamento)
├── src/
│   ├── api/
│   │   ├── client.ts            # HTTP client genérico (cópia adaptada de mobile/src/api/client.ts)
│   │   ├── auth.ts               # POST /api/auth/login
│   │   ├── dashboard.ts          # GET /api/dashboard/department-demands
│   │   ├── types.ts              # DTOs (AuthUser, DepartmentDemand, ...)
│   │   └── useDepartmentDemands.ts  # Hook de auto-refresh (60s) com retry silencioso
│   ├── components/
│   │   ├── FocusablePressable.tsx  # Botão com destaque visual de foco por D-pad
│   │   └── DepartmentCard.tsx      # Card de departamento no painel
│   ├── context/
│   │   └── AuthContext.tsx      # Sessão JWT persistida em expo-secure-store
│   ├── config/
│   │   └── env.ts                # EXPO_PUBLIC_API_URL + intervalo de refresh
│   └── types/
│       └── react-native-tv.d.ts  # Augmentação de tipos para props de TV (hasTVPreferredFocus, isTVSelectable)
├── assets/                      # Ícones/branding (copiados de mobile/assets)
├── app.json                     # Config Expo (orientation: landscape, android.package distinto do mobile)
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env.example
└── .gitignore
```

---

## 3. Como instalar e rodar

### 3.1. Dependências
```bash
cd tv
npm install
```

### 3.2. Variável de ambiente
```bash
cp .env.example .env
# Edite tv/.env com o IP da máquina que roda o backend na rede local
# (a TV/box é um aparelho físico separado — "localhost" não funciona):
# EXPO_PUBLIC_API_URL=http://192.168.0.10:5000/api
```

### 3.3. Gerar o dev client (build de desenvolvimento) para instalar numa TV real
Expo Go **não serve** aqui — é obrigatório gerar um APK próprio (dev client)
por causa do `react-native-tvos`. `@react-native-tvos/config-tv` já está
instalado como dev dependency e registrado em `app.json` → `plugins`
(passo "Add the TV config plugin" do guia oficial já feito neste repo — não
precisa repetir `npx expo install @react-native-tvos/config-tv --dev`).

**Passo 1 — gerar o projeto Android nativo configurado para TV** (CNG —
continuous native generation; comando já executado e validado nesta sessão,
ver seção 1):
```bash
cd tv
npm run prebuild:tv
# equivalente a: EXPO_TV=1 npx expo prebuild --platform android --clean
```
Isso cria a pasta `tv/android/` (não versionada — está no `.gitignore`,
igual ao padrão de apps bare/prebuild do Expo) já configurada como app de TV
(launcher da Android TV Home / Leanback, sem exigência de touchscreen —
confirmado inspecionando o `AndroidManifest.xml` gerado, ver seção 1).

**Passo 2 — build do APK**, duas opções:

- **Opção A (recomendada, sem precisar de Android SDK local): EAS Build.**
  Crie um `eas.json` com um profile que define `EXPO_TV=1` (receita oficial
  do guia, para poder buildar TV e celular a partir do mesmo código-fonte):
  ```json
  {
    "cli": { "version": ">= 5.2.0" },
    "build": {
      "development_tv": {
        "extends": "development",
        "env": { "EXPO_TV": "1" },
        "android": { "buildType": "apk" },
        "channel": "development"
      }
    }
  }
  ```
  Depois:
  ```bash
  npx eas login
  npx eas build:configure
  npx eas build --platform android --profile development_tv
  ```
  Baixe o APK gerado pelo link que o EAS devolve.

- **Opção B (local, requer Android SDK + JDK instalados na máquina, com um
  emulador de Android TV ou device físico conectado via `adb`):**
  ```bash
  cd tv
  npm run android:tv
  # equivalente a: EXPO_TV=1 npx expo run:android
  ```
  Esse comando reaproveita o `android/` já gerado (ou gera na hora, se
  ausente), compila e instala direto no emulador/device de TV conectado —
  é o comando recomendado pelo guia oficial para rodar em um emulador de
  Android TV.

**Passo 3 — instalar o APK numa Android TV/Fire TV Box física** (quando não
há `adb`/emulador local disponível, ex.: usando o APK baixado do EAS Build):
```bash
# Com a TV/box na mesma rede e Depuração ADB via rede habilitada
# (Configurações > Preferências do dispositivo > Sobre > compilação 7x para
# ativar modo desenvolvedor > Depuração de rede/USB):
adb connect <IP_DA_TV>:5555
adb install caminho/para/o.apk
```
Alternativa sem ADB: publicar o APK num link (Google Drive, servidor local)
e instalar via um app sideload como "Downloader" (disponível na loja da
Fire TV/Android TV).

### 3.4. Rodar em modo desenvolvimento (Metro) apontando pro dev client instalado
Uma vez com o dev client instalado na TV (passo 3.3), basta iniciar o Metro
Bundler normalmente:
```bash
cd tv
npm start
```
Com o dev client aberto na TV e na mesma rede, ele conecta ao Metro rodando
na máquina de desenvolvimento (mesmo fluxo de "development build" do Expo
usado por apps bare/CNG).

### 3.5. Voltar o projeto para desenvolvimento mobile normal (se necessário)
Como a configuração de TV é toda dirigida pela env var `EXPO_TV` no momento
do `prebuild` (o restante do código-fonte é o mesmo), é possível reverter a
pasta nativa gerada para "modo celular" sem tocar em nada além disso:
```bash
unset EXPO_TV
npx expo prebuild --clean
```

---

## 4. Validação já feita (sem hardware)

```bash
cd tv
npx tsc --noEmit                                    # OK — sem erros de tipo
npx expo export --platform android                  # OK — bundle Metro exportado com sucesso
EXPO_TV=1 npx expo prebuild --platform android --clean  # OK — AndroidManifest.xml confirmado com config de TV (LEANBACK_LAUNCHER, touchscreen not required)
```

---

## 5. Validações pendentes — precisam de dispositivo/emulador Android TV real

Nada abaixo foi possível verificar neste ambiente headless (sem Android SDK
completo com build-tools/NDK, sem emulador de Android TV, sem hardware
físico conectado). O item de geração do manifest nativo (que estava nesta
lista) já foi confirmado — ver seção 1.

1. **Build do APK (EAS ou `expo run:android` local) completa sem erros
   nativos** — o fork `react-native-tvos` pode exigir ajustes de versão de
   Kotlin/Gradle/NDK dependendo do ambiente (SDK/build-tools instalados);
   isso só aparece ao rodar o build de verdade com Android SDK disponível.
2. **Navegação por D-pad funciona visualmente**: foco inicial no campo de
   e-mail do login (`hasTVPreferredFocus`), navegação entre e-mail → senha →
   botão "Entrar" com as setas do controle, destaque visual do item focado
   (borda azul + leve zoom em `FocusablePressable`).
3. **Teclado virtual do Android TV abre corretamente** ao focar/selecionar
   os campos de `TextInput` (E-mail/Senha) — comportamento nativo do
   Android TV, não controlado pelo app.
4. **Legibilidade a distância ("10-foot UI")** dos tamanhos de fonte/espaçamento
   definidos em `dashboard.tsx` e `DepartmentCard.tsx` — validar numa TV real
   a ~2-3 metros de distância e ajustar `fontSize`/`padding` se necessário.
5. **Auto-refresh de 60s e indicador de status** ("Atualizado há Xs" / "Erro
   ao atualizar, tentando novamente…") — validar o comportamento em uma
   janela de tempo real, incluindo o cenário de queda de rede (desligar
   Wi-Fi do box) para confirmar que o painel NÃO trava numa tela de erro e
   mantém os últimos dados visíveis.
6. **Persistência de sessão entre reinícios do aparelho** (desligar/religar a
   TV, ou fechar e reabrir o app) — confirmar que `expo-secure-store` mantém
   o JWT no Android TV (mesmo mecanismo do Keystore usado no celular, mas
   ainda não testado especificamente em hardware de TV).
7. **Ícone/banner de TV**: `assets/android-icon-*.png` foram reaproveitados
   do `mobile/` (ícone quadrado de celular). O launcher da Android TV Home
   usa um **banner** widescreen (320×180) — se o app não tiver
   `android.banner` configurado, o Android TV usa um banner genérico gerado
   automaticamente a partir do ícone. Recomenda-se criar um banner dedicado
   (`assets/tv-banner.png`, 320×180) e referenciá-lo em `app.json` →
   `android.tvBanner` antes do lançamento em produção.
8. **Performance do bundle Hermes (`.hbc`, ~2.6-3.3MB) e tempo de boot** no
   hardware real do box (Fire TV Stick/box Android TV costumam ter CPU/RAM
   bem mais limitados que celulares).
9. **`eas.json`** ainda não foi criado neste repo (não há conta/projeto EAS
   configurado nesta sessão) — o trecho na seção 3.3 é o modelo recomendado
   pelo guia oficial; rodar `npx eas build:configure` na primeira vez que for
   usar EAS Build vai gerar/mesclar o arquivo real.

---

## 6. Fora de escopo desta entrega (por design)

- Interação além do login (sem navegação profunda, sem telas extras).
- Modo offline.
- iOS/tvOS (Apple TV) — só Android TV por agora.
- Drill-down por item de demanda (o painel mostra contagens + até 3 itens de
  prévia por categoria; não é uma tela de trabalho).
