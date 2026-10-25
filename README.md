# NeoGroup Crisol

RPG de fantasía por turnos para un jugador: un mundo laberíntico de más de 1.000 puntos al estilo de los mapas de _Super Mario World_, combate por turnos según la velocidad al estilo de _Clair Obscur_, campamentos y castigo por muerte al estilo de _Dark Souls_ y batallas laterales al estilo de _Hero Wars_. Se publica como PWA en Vercel y en Google Play como TWA.

El diseño completo (mapa, personajes, combate, runas y ecos, Nuevo Juego+, fases) está en el plan de implementación del proyecto. Este repositorio va por la **fase 2**: además de la base (auth, PWA, i18n) y el menú Continuar / Nuevo con el guardado de la partida, ya está el generador del mundo.

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **MUI** + **SASS** (un `index.scss` por componente, mobile-first)
- **Auth.js v5** (Google + email/contraseña con verificación por email y recupero de contraseña vía Resend)
- **@neogroup/neorm** para el acceso a datos (PostgreSQL; SQLite en memoria en los tests)
- **zustand** para los stores del cliente
- **Serwist** para PWA / offline
- Tipografías self-hosted (`@fontsource`)
- UI en inglés (por defecto) y español

Próximas fases: **PixiJS** para el mapa y las batallas, Spine/DragonBones para las animaciones y Howler.js para el audio.

## Getting started

1. Instalar dependencias:

   ```bash
   yarn install
   ```

2. Crear el archivo de entorno y completar `AUTH_SECRET` (`openssl rand -base64 32`), las credenciales OAuth de Google, `RESEND_API_KEY` y los `DB_*`:

   ```bash
   cp .env.example .env
   ```

   - **Google OAuth**: en Google Cloud Console crear un OAuth Client (Web) con redirect URI `http://localhost:3000/api/auth/callback/google` (y la del dominio productivo).
   - Sin `RESEND_API_KEY` los mails no se envían: el link de verificación / reseteo se imprime en la consola del servidor.

3. Levantar PostgreSQL local, correr las migraciones y el seed (usuario demo `demo@crisol.app` / `demo1234`):

   ```bash
   yarn db:local:up
   yarn db:migrate      # crea la base si no existe
   yarn db:seed
   ```

   Para recrear la base local desde cero: `yarn db:reset` y después `yarn db:seed`.

4. Levantar el servidor de desarrollo:

   ```bash
   yarn dev
   ```

## Project structure

Igual que en GeoQuests, el código está organizado en **módulos** dentro de `app/` (no hay carpeta `src/`). Cada módulo es un _route group_ de Next.js que encapsula todo lo relacionado con esa funcionalidad.

```
app/
  layout.tsx              Root layout (tema, fuentes, service worker, toasts, GTM)
  page.tsx                Entry point: landing pública o redirección al menú principal
  globals.scss            Tokens de diseño (colores, safe areas, breakpoints) y estilos globales
  components/             Componentes compartidos (ThemeRegistry, GameButton, GamePanel, Logo, Loading, PlayerAvatar)
  models/                 Modelos compartidos (User, UserDto, ApiResponse, ApiException)
  hooks/                  Hooks compartidos (useRequests, useNotifications, useLoadingData, useInstallPrompt...)
  utils/                  Utilidades compartidas (api-server, email, urls, users, time, environment)
  i18n/                   Idiomas: diccionarios, provider y helpers de servidor
  (auth)/                 Autenticación (login, registro, verificación de email, recupero de contraseña)
  (public)/               Landing, política de privacidad y borrado de cuenta (públicas)
  (pwa)/                  Manifest, service worker (Serwist), página offline, banner de instalación, assetlinks
  (protected)/            Módulos que requieren sesión (ver abajo)
proxy.ts                  Protección de rutas (middleware de Next.js — tiene que estar en la raíz)
database/migrations/      Migraciones (yarn db:migrate)
scripts/                  migrate / reset / seed de la base
tests/                    Tests (Vitest)
```

```
app/(protected)/
  components/AppShell/    Barra superior de las páginas autenticadas (logo y menú del jugador)
  stores/users.ts         Store con el usuario logueado
  (home)/                 Menú principal (/menu): Continuar / Nuevo
  (world)/                El mundo (/world). Por ahora muestra la partida cargada; el mapa llega en la fase 3
  (engine)/               Lógica pura del juego (sin React ni base de datos): estado de la partida, el mundo, reglas, catálogos
  (saves)/                Partida guardada: tabla `saves`, servicios y API
  (account)/              Perfil del jugador (nombre, idioma, borrado de cuenta)
```

### Anatomía de un módulo

```
app/(module)/
  components/      Componentes del módulo — cada uno en su carpeta: index.tsx + index.scss
  models/          Entidades neorm (una por tabla) y tipos/DTOs del FE
  stores/          Stores zustand del módulo
  hooks/           Hooks del módulo — acá viven también las llamadas a la API (useRequests)
  utils/           Utilidades puras del módulo
  services/        Servicios del BE (lógica de negocio, queries)
  (pages)/         Páginas del módulo (route group: no afecta la URL)
  (api)/           Endpoints del módulo, en (api)/api/<verboSustantivo>/route.ts
```

Los imports siempre son absolutos con el alias `@/` (lo exige ESLint).

### API endpoints

Siempre `POST` con body JSON, nombre `verbNoun` (`/api/loadGame`, `/api/saveGame`...), respuesta `{ success, data }` / `{ success: false, error: { name, message } }`. Los handlers se envuelven con `withApi` (público) o `withAuth` (requiere sesión, inyecta el `userId`) de `app/utils/api-server.ts`, y los errores se señalizan tirando `ApiException(messageKey, status)`. En el FE, `useRequests()` devuelve `executeRequest<T>(url, payload)`.

## La partida guardada — `app/(protected)/(saves)`

Una sola partida por cuenta, en la tabla `saves`:

| Columna           | Descripción                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `userId`          | Único: "Nuevo" reemplaza la partida anterior (el menú lo confirma antes)                 |
| `cycle`           | Ciclo de Nuevo Juego+ (0 = primera partida)                                              |
| `worldVersion`    | Versión del mundo (`world.json`) sobre la que se jugó                                    |
| `saveVersion`     | Forma de `data`; una partida de una forma anterior se migra al cargarla                  |
| `version`         | Se incrementa en cada escritura (bloqueo optimista: la misma cuenta en dos dispositivos) |
| `playTimeSeconds` | Tiempo de juego                                                                          |
| `data`            | El `GameState` completo (`(engine)/models/GameState.ts`)                                 |

El juego corre en el navegador y manda el estado entero: el servidor solo valida su forma (`isGameState`) y su versión, nunca simula el juego (es de un jugador y no hay ranking). Endpoints: `getSaveSummary` (lo que muestra el menú), `loadGame`, `newGame` y `saveGame` (`{ version, playTimeSeconds, state }`; rechaza con 409 una versión vieja).

El mundo y los catálogos (personajes, habilidades, runas, enemigos...) no se guardan en la base: viven en el código, y la partida los referencia por id.

## El mundo — `app/(protected)/(engine)`

Aurenya es el mismo para todos los jugadores: un grafo fijo guardado en `public/world/world.json` que sale de un generador determinístico (misma semilla ⇒ mismo mundo).

```bash
yarn world:generate   # regenera public/world/world.json con WORLD_SEED e imprime estadísticas
```

- **Datos**: `data/biomes.ts` (los 9 biomas: niveles, cantidad de puntos, jefes, santuarios, mercader, lágrima, cofres y qué biomas se tocan) y `data/world.ts` (`WORLD_SEED`, `WORLD_VERSION`, `START_NODE_ID`).
- **Generador** (`utils/worldGenerator.ts`): regiones de bioma con un Voronoi deformado por ruido, puntos repartidos con distancia mínima, triangulación de Delaunay como senderos candidatos, un árbol de Kruskal por bioma (grado ≤ 4, laberinto con callejones) más un 12% de senderos extra que cierran ciclos, y un único sendero de frontera por par de biomas vecinos. Después ubica el inicio, los 29 campamentos con jefe (4 captores, 3 Sellos, 22 minijefes), los 60 santuarios en callejones sin salida, los 5 mercaderes, las 5 Lágrimas, los cofres, la puerta del Abismo y a Crisol, y asigna los niveles de cada pelea.
- **Validación** (`utils/worldValidation.ts`): todo lo que el diseño exige (conexo, grados, fronteras, conteos por bioma, el Abismo cerrado sin la puerta, campamentos a ≤ 40 pasos, runas 1..60 por tier...). El generador prueba semillas hasta que una pasa, y los tests validan el `world.json` guardado.
- Si se regenera el mundo con cambios, subir `WORLD_VERSION`: las partidas guardan sobre qué versión se jugaron.

En desarrollo, **`/dev/world`** muestra el mundo completo en un visor SVG (zoom con la rueda, arrastrar para moverse, niveles, leyenda con conteos e info del punto bajo el mouse). En producción esa página no existe.

## PWA

Manifest en `/manifest.webmanifest`, service worker de Serwist en `/serwist/sw.js`, página offline `/~offline` e íconos en `public/` (todavía los de GeoQuests: se reemplazan con el arte de Crisol).

### Google Play (Trusted Web Activity)

La app Android es una TWA (generada con PWABuilder o Bubblewrap) que abre este sitio. Lo que la publicación necesita del lado web:

- `/privacy` (política de privacidad) y `/delete-account` (cómo borrar la cuenta): públicas con o sin sesión (`OPEN_PATHS` en `auth.config.ts`). El email de contacto sale de `CONTACT_EMAIL` (por defecto `support@crisol.app`, ver `app/utils/legal.ts`).
- Borrado de cuenta desde Mi perfil (`POST /api/deleteAccount`, `services/accounts.ts`): se borran el usuario, sus tokens y su partida guardada.
- `/.well-known/assetlinks.json`: se arma con `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_CERT_FINGERPRINTS` (SHA-256 separados por coma, de Play Console → Integridad de la app → Firma de apps).

## Testing

```bash
yarn test
```

- `tests/unit` — diccionarios (mismas claves y placeholders en todos los idiomas), traductor, idiomas y formatos; el mundo (el `world.json` guardado es válido y es el que genera la semilla, el generador es determinístico y la validación detecta mundos rotos) y los utilitarios de grafos.
- `tests/flows` — contra SQLite en memoria con las migraciones reales: partida guardada (nueva, cargar, guardar, bloqueo optimista, validación del estado, reemplazo) y borrado de cuenta.

## Idiomas (i18n)

La app está disponible en inglés (idioma por defecto) y español. El jugador elige el idioma en **Mi perfil**.

- **Diccionarios**: `app/i18n/messages/es.ts` (referencia de la forma) y `en.ts` (debe tener la misma forma; el compilador y `tests/unit/i18n.test.ts` lo verifican). Las claves se usan con `t('grupo.clave', { param })`; un mensaje `{ one, other }` es un plural que se elige con `count`.
- **Componentes cliente**: `const t = useT()` (o `const { t, locale } = useI18n()`) de `app/i18n/I18nProvider`. **Servidor** (páginas, rutas API): `const t = await getT()` de `app/i18n/server`.
- **Idioma de cada request**: el guardado en el usuario (viaja en la sesión JWT) → cookie `locale` → cabecera `Accept-Language` → inglés.
- **Errores de la API**: `new ApiException('errors.clave', status, params)`; la respuesta los envía traducidos al idioma del request.
- **Agregar un idioma**: sumarlo a `LOCALES`, `LOCALE_NAMES` y `LOCALE_TAGS` (`app/i18n/config.ts`), crear su diccionario y registrarlo en `app/i18n/messages/index.ts`.
