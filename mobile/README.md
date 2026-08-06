# ERP Evok Áudio — App Mobile (Estoque)

App mobile (Android + iOS) em **React Native + Expo (Expo Router)** para operação de estoque em campo: login, leitura de QR Code/código de barras de produtos e registro de movimentações de entrada/saída, e histórico de movimentações.

Escopo atual: **login + inventário mobile com scanner + histórico** (movimentação avulsa) e **contagem de inventário cíclico** (`InventoryCount`, fluxo separado de execução de contagens atribuídas/pool). Nenhum outro módulo do ERP (vendas, produção, financeiro etc.) está implementado aqui — ver `CLAUDE.md` na raiz do repositório para o roadmap completo.

## Pré-requisitos

- Node.js 18+ (mesma versão usada em `server/` e `client/`)
- [Expo Go](https://expo.dev/go) instalado no celular (Android/iOS) **ou** um emulador Android (Android Studio) **ou** simulador iOS (Xcode, apenas macOS)
- Backend do ERP (`server/`) rodando e acessível na rede (ver `npm run server` na raiz do repo)

## Configuração

1. Instale as dependências:
   ```bash
   cd mobile
   npm install
   ```

2. Copie o arquivo de ambiente de exemplo e configure a URL da API:
   ```bash
   cp .env.example .env
   ```
   Edite `mobile/.env` e ajuste `EXPO_PUBLIC_API_URL` para o endereço do backend. **Importante:** como o app roda em um dispositivo físico ou emulador (não no mesmo processo do backend), `localhost` **não** aponta para a sua máquina de desenvolvimento. Use:
   - **Emulador Android (AVD):** `http://10.0.2.2:5000/api`
   - **Dispositivo físico (Expo Go) na mesma rede Wi-Fi:** `http://<IP-da-sua-máquina>:5000/api` (ex.: `http://192.168.0.10:5000/api` — descubra o IP com `ipconfig` no Windows)
   - **Simulador iOS (macOS):** `http://localhost:5000/api` funciona, pois o simulador roda na mesma máquina
   - **Túnel reverso / produção:** URL pública do túnel/domínio, ex. `https://api.evokaudio.com.br/api`

   A porta padrão do backend é `5000` (`server/src/config/runtimeEnv.ts`, variável `PORT`) — confirme com quem configurou o `.env` do backend caso tenha sido alterada.

## Rodando o app

```bash
cd mobile
npx expo start
```

Isso abre o Metro Bundler com um QR Code no terminal:
- **Celular físico:** abra o app **Expo Go** e escaneie o QR Code (Android) ou use a câmera nativa (iOS).
- **Emulador Android:** com o Android Studio/AVD já rodando, pressione `a` no terminal do Expo.
- **Simulador iOS (macOS):** pressione `i` no terminal do Expo (requer Xcode).

Scripts disponíveis (`package.json`):
```bash
npm start       # equivalente a `npx expo start`
npm run android # abre direto no emulador/dispositivo Android
npm run ios     # abre direto no simulador iOS (macOS)
npm run web     # preview web (não é o alvo desta entrega, mas ajuda a depurar UI rapidamente)
```

## Estrutura de pastas

```
mobile/
├── app/                        # Rotas (expo-router — file-based routing)
│   ├── _layout.tsx              # Layout raiz: providers globais (Auth, SafeArea, GestureHandler)
│   ├── index.tsx                 # Rota "/": decide login vs. home com base na sessão salva
│   ├── login.tsx                  # Tela de login
│   └── (app)/                    # Grupo de rotas autenticadas (guard de sessão)
│       ├── _layout.tsx            # Stack autenticado + redirect para /login se não houver sessão
│       ├── home.tsx               # Inventário mobile: scanner + formulário de movimentação
│       ├── history.tsx            # Histórico de movimentações (paginado)
│       └── counts/                # Contagem de Inventário (InventoryCount)
│           ├── index.tsx           # Lista: "Minhas contagens" (assigned_to=me) + "Disponíveis (pool)"
│           └── [id].tsx            # Detalhe/execução: iniciar (claim do pool), contar itens (com scanner), enviar p/ aprovação
├── src/
│   ├── api/
│   │   ├── client.ts             # fetch wrapper genérico: headers, parsing de erro, ApiError
│   │   ├── auth.ts                # POST /api/auth/login
│   │   ├── mobileInventory.ts     # POST /api/mobile-inventory/scan, GET /api/mobile-inventory/movements
│   │   ├── inventoryCounts.ts     # GET/POST /api/inventory-counts/* (contagens de inventário cíclico)
│   │   └── types.ts               # Tipos dos contratos JSON (espelham os DTOs do backend)
│   ├── context/
│   │   └── AuthContext.tsx        # Estado de sessão (token JWT via expo-secure-store)
│   ├── components/
│   │   └── QrScannerModal.tsx     # Modal de câmera com leitura de QR/código de barras
│   └── config/
│       └── env.ts                 # Leitura de EXPO_PUBLIC_API_URL
├── assets/brand/                 # Logo Evok Áudio (copiado de client/src/assets/brand/)
├── app.json                      # Config Expo (permissões de câmera, plugins, scheme)
├── babel.config.js
└── .env.example
```

## Decisões técnicas

- **Expo SDK 57** (`create-expo-app@latest`, template `blank-typescript`), com **Expo Router** (file-based routing, é o padrão atual recomendado pelo Expo em vez de `@react-navigation` configurado manualmente). Como consequência, `main` em `package.json` aponta para `expo-router/entry` e não existe mais `App.tsx`/`index.ts` na raiz — as telas ficam em `app/`.
- **`expo-camera` (`CameraView`)**: API atual do módulo (a antiga `Camera`/`BarCodeScanner` foi descontinuada). Uso de `barcodeScannerSettings={{ barcodeTypes: [...] }}` + `onBarcodeScanned`, com um guard (`useRef`) para não disparar o callback várias vezes para o mesmo frame antes do modal fechar. Tipos de código aceitos: `qr`, `ean13`, `ean8`, `code128`, `code39`, `upc_a`, `upc_e` — cobre tanto QR Code quanto etiquetas de código de barras tradicionais de estoque industrial.
- **`expo-secure-store`** para o token JWT (Keychain no iOS / Keystore no Android) em vez de `AsyncStorage`, por se tratar de credencial de sessão — segue a orientação do enunciado e das boas práticas de segurança do Expo.
- **Tratamento de erro da API**: o backend (`server/src/middlewares/errorHandler.ts`) responde erros em dois formatos possíveis — `{ success: false, error: "mensagem" }` (Sequelize, rate-limit) ou `{ success: false, error: { code, message, details? } }` (`AppError` e subclasses). O client (`src/api/client.ts`) trata as duas formas e expõe uma classe `ApiError` única com `status`/`code`/`message` para as telas.
- **401 global**: qualquer resposta 401 de qualquer endpoint (exceto o próprio `/auth/login`) dispara automaticamente o logout local (limpa `SecureStore` e o contexto de auth), forçando o usuário de volta à tela de login — implementado via `setUnauthorizedHandler` em `client.ts`, chamado pelo `AuthContext`.
- **`react-native-reanimated` 4.x**: como o template do Expo SDK 57 não gera `babel.config.js` por padrão, foi necessário criar um manualmente com `babel-preset-expo` + o plugin `react-native-worklets/plugin` (Reanimated 4 migrou o motor de worklets para o pacote `react-native-worklets` separado). `babel-preset-expo` também precisou ser adicionado como `devDependency` direta — por padrão ele só existe aninhado em `node_modules/expo/node_modules/babel-preset-expo`, o que quebra a resolução do Babel quando há um `babel.config.js` próprio no projeto.
- **Permissões de câmera**: declaradas em `app.json` (`NSCameraUsageDescription` para iOS, `CAMERA` em `android.permissions`) e via plugin `expo-camera` (que já injeta a permissão automaticamente — a declaração manual é redundante mas explícita/documentada).

## Contagem de Inventário (Inventário Cíclico)

Fluxo separado da movimentação avulsa de estoque, para o processo de contagem cíclica/geral/pontual criado pelo supervisor no painel web (módulo `InventoryCount`, base `/api/inventory-counts`, documentado em `docs/arquitetura/API.md` seção 8.2):

- **Lista** (`(app)/counts/index.tsx`): duas seções — "Minhas contagens" (`GET /api/inventory-counts?assigned_to=me`) e "Disponíveis (pool)" (`GET /api/inventory-counts?unassigned=true&status=draft`), com pull-to-refresh.
- **Detalhe/execução** (`(app)/counts/[id].tsx`):
  - Contagem ainda `draft` (vinda do pool ou não iniciada): botão "Iniciar contagem" chama `POST /:id/start`. Se outro funcionário já pegou a contagem no meio tempo, o backend responde **409 CONFLICT** — tratado com alerta ("Esta contagem já foi pega por outro funcionário.") e volta para a lista.
  - Contagem `counting`: lista de itens com quantidade de sistema (`system_quantity`) e campo de quantidade contada. Cada item é salvo individualmente (`POST /:id/items/:itemId/count`, payload `{ counted_quantity: number }`) assim que o operador toca em "Salvar" — não fica pendente só para o envio final, evitando perda de trabalho se o app fechar no meio.
  - Botão "Escanear produto" reaproveita `QrScannerModal` e, ao ler um código, localiza o item correspondente (`product.code`) na lista e o destaca/rola até ele automaticamente.
  - Botão "Enviar para aprovação" (`POST /:id/submit`) só é liberado com todos os itens já contados — o backend valida isso de novo no servidor (`SubmitInventoryCountUseCase`, erro 422 se houver item `pending`).
  - Aprovar/rejeitar contagens é exclusivo do painel web (`POST /:id/approve` e `/:id/reject`) — não implementado no app mobile.

## Validado nesta entrega

- `npx tsc --noEmit` sem erros.
- `npx expo-doctor` — 20/20 checks OK.
- `npx expo export --platform android` — bundle Metro compila com sucesso (smoke test sem dispositivo real).

## Fora de escopo (não implementado)

- Outros módulos do ERP (vendas, produção, financeiro, dashboard etc.).
- Modo offline / fila de sincronização de movimentações.
- Push notifications.
- Testes automatizados E2E.
