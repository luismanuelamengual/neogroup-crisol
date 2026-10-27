# NeoGroup Crisol

RPG de fantasía por turnos para un jugador: un mundo laberíntico de más de 1.000 puntos al estilo de los mapas de _Super Mario World_, combate por turnos según la velocidad al estilo de _Clair Obscur_, campamentos y castigo por muerte al estilo de _Dark Souls_ y batallas laterales al estilo de _Hero Wars_. Se publica como PWA en Vercel y en Google Play como TWA.

El diseño completo (mapa, personajes, combate, runas y ecos, Nuevo Juego+, fases) está en el plan de implementación del proyecto. Este repositorio va por la **fase 5**: la base (auth, PWA, i18n), el menú Continuar / Nuevo, el generador del mundo, el mapa jugable (PixiJS) con guardado local, el combate por turnos con arte provisorio, y la progresión y la economía (atributos, árboles de habilidades, armas, runas, Ecos, objetos, mercaderes, bestiario y formación). El contenido completo (225 habilidades, 80 enemigos, 42 jefes) llega en la fase 6.

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **MUI** + **SASS** (un `index.scss` por componente, mobile-first)
- **Auth.js v5** (Google + email/contraseña con verificación por email y recupero de contraseña vía Resend)
- **@neogroup/neorm** para el acceso a datos (PostgreSQL; SQLite en memoria en los tests)
- **zustand** para los stores del cliente
- **Serwist** para PWA / offline
- Tipografías self-hosted (`@fontsource`)
- UI en inglés (por defecto) y español

- **PixiJS 8** + **pixi-viewport** para el mapa y la escena de batalla

Próximas fases: Spine/DragonBones para las animaciones y Howler.js para el audio.

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
  components/             Componentes compartidos (ThemeRegistry, GameButton, GamePanel, CommandMenu, Logo, Loading, PlayerAvatar)
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
  components/AppShell/    Contenedor de las páginas autenticadas (sin barra: cada pantalla ocupa todo)
  stores/users.ts         Store con el usuario logueado
  (home)/                 Menú principal (/menu): Continuar / Nuevo / Mi perfil / Cerrar sesión
  (world)/                El mapa jugable (/world): render PixiJS, interfaz, sesión de juego y sincronización
  (battle)/               La escena de batalla: render PixiJS lateral e interfaz de turnos
  (party)/                Pantalla del grupo (formación, atributos, árbol, arma, runas, ecos, inventario, bestiario) y la tienda
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

## El mapa jugable — `app/(protected)/(world)`

- **Reglas** (`(engine)/utils/worldMap.ts`, funciones puras con tests): niebla (se ven los puntos despejados y sus vecinos como siluetas), ruta más corta por puntos despejados (una pelea sin ganar, o que volvió al descansar, corta el paso), llegada a un punto, victoria (campamento, rescate del cautivo, runa, Lágrima, mejoras del Frasco, apertura del Abismo), derrota (se despierta en el último descanso), retirada (no contra jefes), descanso, teletransporte entre campamentos abiertos y el Frasco de Ámbar.
- **Frasco de Ámbar**: arranca con 1 carga al 10 %; cada Sello suma una carga (máximo 4) y cada Ascua (los 4 captores y 6 minijefes, `data/flask.ts`) suma +5 % (máximo 60 %). Se recarga al descansar.
- **Enemigos que vuelven**: al descansar reaparecen los combates comunes ya ganados (punto rojo en el marcador). Cortan el paso como una pelea nueva: para pasar hay que ganarles otra vez. Jefes, guardianes y élites no vuelven en el mismo ciclo.
- **Render** (`utils/worldRenderer.ts`): fondo por bioma pintado una vez en un canvas, senderos punteados, marcadores por tipo, niebla en una máscara de baja resolución, héroe que camina por los senderos y cámara con arrastre, pinch y rueda.
- **Interfaz** (`components/`): `MapHud` (volver al menú, lugar, oro, estado del guardado, centrar), `PartyPanel` (vida del grupo y Frasco), `PointPanel` (el punto tocado: Ir, Descansar, Viajar) y `TeleportDialog`; una pelea abre la escena de batalla encima del mapa. Tocar un punto lo selecciona; tocarlo de nuevo (o "Ir") camina hasta él.

### Guardado local y sincronización

Cada acción cambia el `GameState` y se escribe al instante en IndexedDB (`(saves)/utils/localSaves.ts`), así cerrar la app nunca deshace una derrota y se puede jugar sin conexión. Los cambios se suben con `/api/saveGame` al descansar, al perder, al ganar un campamento, cada 2 minutos, al pasar la app a segundo plano y al volver la red (`(world)/hooks/useGameSession.ts`). Al entrar, `chooseSave` elige entre la copia local y la del servidor: una copia de otra partida (un "Nuevo" en otro dispositivo) siempre pierde, y si las dos avanzaron gana la de más tiempo de juego, con aviso. El mundo (`world.json`) queda precacheado por el service worker.

`SAVE_VERSION` va por la 4 (la 3 agrega `kills`, el bestiario; la 4 agrega la build de cada personaje, el inventario, las runas, su dominio, las Lágrimas y los Ecos): las partidas viejas se migran al cargarlas (`migrateGameState`, con test).

## El combate — `(engine)/utils/battle.ts` y `app/(protected)/(battle)`

- **Motor puro y determinístico** (`battle.ts`, con tests): `createBattle`, `nextTurn`, `performAction`, `chooseEnemyAction`, `getTurnQueue`. El azar sale de una semilla guardada en el `BattleState`, así una pelea se puede repetir igual.
- **Turnos por velocidad**: cada luchador llena su iniciativa hasta 100 y actúa; la cola muestra los próximos 8 turnos. Al empezar su turno recupera un 12 % de foco.
- **Acciones**: Atacar (gratis), habilidades especiales (cuestan foco; a un enemigo, a todos, a un aliado, a todos los aliados o a sí mismo) y Retirarse (no contra jefes).
- **Daño**: `poder × multiplicador × 100/(100+defensa) × elemento × crítico × ±5 %`, con debilidad 1,5, resistencia 0,5, inmunidad y absorción. Estados: veneno, quemadura, congelación, aturdimiento, sangrado, ceguera y subidas o bajadas de ataque, defensa y velocidad.
- **Peleas** (`encounters.ts`): de 1 a 3 fases de 1 a 3 enemigos según el nivel; élites con un enemigo de élite al final; guardianes, minijefes, captores, sellos y el Crisol con sus jefes propios (algunos con 2 barras, el Crisol 3; al vaciar una barra se transforman, pegan más fuerte y algunos aprenden habilidades nuevas). Las especies raras de cada bioma aparecen menos (común 6, poco común 3, rara 1) y desde el nivel 12 los minijefes de una barra vienen con escolta. Hasta 3 héroes activos; los de reserva entran juntos cuando caen todos.
- **Resultado** (`battleResult.ts`): la victoria da XP y oro a los que pelearon y suma al bestiario; los caídos vuelven con 1 de vida. La derrota cuesta la mitad de la XP del nivel actual y despierta en el último descanso; la retirada cuesta el 10 %.
- **Catálogos** (`data/`): `skills.ts` (habilidades de héroes y enemigos), `characters.ts` (estadísticas y crecimiento por nivel) y `enemies.ts`: 9 especies por bioma (4 comunes, 3 poco comunes y 2 raras) y 42 jefes (22 minijefes, 4 captores, 3 Sellos, 12 guardianes de santuario y el Crisol). Los enemigos de cada bioma escalan además con el tamaño del grupo que el jugador tiene ahí (`BIOME_HEALTH` y `BIOME_POWER`; los jefes, algo menos).
- **Mecánicas propias**: Kael alterna postura ofensiva y defensiva; Sera marca a sus presas (cada marca suma crítico hasta acertar uno); Brann acumula furia al recibir daño (más ataque, y algunas habilidades la gastan); Oren cura más con su savia y puede revivir y limpiar estados; Ysolde se carga con los elementos que lanza y los gasta de golpe. El estado se ve en la tarjeta de cada héroe.
- **Escena** (`(battle)/utils/battleRenderer.ts`): vista lateral con figuras provisorias, números flotantes, temblor de cámara y velocidad ×1 / ×2 (se recuerda en el dispositivo). La interfaz (`components/BattleScreen`) muestra la cola, las tarjetas de los héroes, las acciones y la elección de objetivo.
- **Balance**: `yarn battles [bioma]` simula una muestra de las peleas de cada bioma (con `DETAIL=1`, cada jefe aparte) y muestra el porcentaje de victorias del grupo que el jugador tiene ahí, a su nivel y con 2 y 4 niveles más, armado como lo haría un jugador (puntos, talentos y arma; `tests/support/builds.ts`).
- **Objetos en batalla**: pociones de vida y concentración, antídoto, revivir, bombas y elixir (`data/items.ts`); se gastan aunque se pierda.

## Progresión y economía — `(engine)/utils/heroes.ts`, `shop.ts` y `app/(protected)/(party)`

- **Niveles**: cada nivel suma un poco de atributos solo, y da 1 punto de atributo (lo elegís vos), 1 punto de habilidad y 1 Eco para el fondo común.
- **Árboles** (`data/talents.ts`): 3 ramas por personaje con especiales nuevos, pasivas y mejoras de especiales (más poder, menos costo, más probabilidad de estados). Cada personaje arranca con su ataque y un especial. Cada rama tiene 15 nodos (225 en total) y el árbol entero cuesta 141 puntos. Con el árbol completo, cada punto nuevo se canjea por 2 Ecos de ese personaje. Una Lágrima del Olvido devuelve todos los puntos.
- **Armas** (`data/weapons.ts`): de +0 a +20 en un campamento, con piedras Tosca, Templada, Arcana y Abisal (1 a 5 por mejora) y oro. Cada nivel da +2 % de poder; +5, +10, +15 y +20 suman un efecto propio de cada personaje.
- **Runas** (`data/runes.ts`): las 60 salen de 12 familias (sanguijuela, brasa, escarcha, resguardo...) en 5 rangos. Cada una da un efecto y mueve uno o dos atributos. 3 por personaje, nunca la misma en dos. Se dominan con 4 batallas ganadas puestas en un héroe activo; su eco (el efecto, sin los atributos) cuesta de 1 a 50 Ecos según su nivel, dentro de la capacidad de Ecos asignada al personaje para siempre.
- **Botín**: cada enemigo puede dejar piedras de su bioma, pociones y, muy raro, un Eco; los jefes siempre dejan piedras. Los cofres dan oro, 2 piedras y una poción. Se llevan hasta 5 de cada consumible.
- **Mercaderes** (`shop.ts`): Buhonero, Alquimista, Herrera y Umbral venden en su punto; el Erudito vende 3 Ecos por ciclo, cada uno más caro.
- **Bestiario** (`data/bestiary.ts`): cada especie vista aparece; con más bajas (menos cuanto más rara: comunes 10/50/150, poco comunes 5/25/75, raras 3/15/40, jefes 1/2/3 victorias) muestra su debilidad principal, después todas sus afinidades y al final sus atributos, habilidades y botín.
- **Formación**: el orden del grupo; los tres primeros pelean y el resto entra junto cuando caen.
- La pantalla del grupo se abre desde el botón Grupo del mapa; el arma, las runas y los ecos se cambian solo en un campamento.

## Nuevo Juego+ — `(engine)/data/cycles.ts` y `utils/worldMap.ts`

- **Empezar el ciclo siguiente**: después de vencer a Crisol, cualquier campamento ofrece Nuevo Juego+ (con confirmación). `startNextCycle` reinicia el mundo en el Claro del Despertar: niebla, campamentos, jefes, Sellos, santuarios, cofres y Lágrimas; también el oro, el inventario y el stock del Erudito. Los personajes conservan todo (niveles, árboles, armas, runas, ecos y capacidad de Ecos), igual que las runas, sus victorias, los Ecos sin asignar, las Lágrimas sin usar y el bestiario. Se puede repetir sin límite y el mapa muestra el ciclo (NG+1, NG+2…).
- **Dificultad**: cada ciclo suma `CYCLE_LEVELS` (45) niveles a los enemigos de cada punto y un 25 % a sus atributos (`CYCLE_POWER`); como el grupo completo pelea desde el principio, los primeros biomas se acercan a la escala del último (`CYCLE_CATCH_UP`). La XP y el oro crecen un 75 % por ciclo. Los jefes suman una habilidad nueva según su arquetipo (`CYCLE_BOSS_SKILLS`).
- **Recompensas alternativas**: un captor sin nadie a quien liberar da 12 Ecos por ciclo y 6 piedras de su bioma; un santuario cuya runa ya tenés da la mitad del costo de su eco en Ecos.
- **Balance**: `CYCLE=1 yarn battles` simula un ciclo con el grupo completo como veterano (arma +20, tres runas fuertes y ecos; `buildVeteran` en `tests/support/builds.ts`).

## Interfaz

Estilo de fantasía oscura, como un RPG de consola: ventanas de cuero oscuro con marco de bronce y diamantes dorados en las esquinas, títulos en Cinzel (Cinzel Decorative para el logo) y texto en Alegreya Sans. No hay barra superior: cada pantalla ocupa todo y el menú principal tiene el perfil y el cierre de sesión.

- **Tokens**: colores, marco (`--frame-border`, `--frame-background`, `--frame-shadow`, `--frame-glow`) y barras de vida y foco en `app/globals.scss`, espejados en `GAME_COLORS` del tema de MUI.
- **Piezas**: `GamePanel` (ventana con título entre filetes), `GameButton` (placa dorada, azul, brasa, verde o de cuero), `CommandMenu` (lista de comandos con cursor que sigue al puntero y a las flechas) y las clases globales `.frame-corners` y `.frame-title`.

## Arte y sonido — `scripts/art` y `app/(protected)/(art)`

- **Guía**: el estilo, la paleta por bioma, los prompts y el orden de los lotes están en la guía de arte y sonido (Claude Docs). Todo se genera sobre fondo verde croma `#00FF00`.
- **Catálogo**: `yarn art:catalog` escribe `art/catalog.csv` con las 258 piezas (id, tipo, tamaño, lote y prompt completo). Los prompts salen de `scripts/art/catalog.ts` y del aspecto de cada especie en `scripts/art/descriptions.ts`.
- **Carga**: los archivos generados van en `art/source/<id>.png` (no se suben al repo) y la música y los efectos en `art/source/music|sfx/<nombre>.mp3`. `yarn art` quita el verde, recorta, achica a WebP en `public/art/`, corta las hojas del mapa (decoraciones 4×4), las de objetos de batalla (`props/<bioma>`, a una escala común) y las de partes, copia el audio a `public/audio/` y escribe `public/art/manifest.json`. Al final lista lo que falta por lote.
- **En el juego**: lo que está en el manifiesto reemplaza el arte provisional (figuras, fondos de combate, decoraciones del mapa); lo que falta sigue dibujado como hasta ahora o queda en silencio. Los héroes son títeres de perfil (`(art)/data/rigs.ts` y `(art)/utils/rig.ts`): un esqueleto fijo y una imagen por parte del cuerpo. Cada héroe tiene su carpeta `heroes/<héroe>/` con `full`, `portrait`, `outfits/<atuendo>/{head,torso,right-arm,left-arm,right-leg,left-leg}` y `weapons/<arma>`. Brazos y piernas vienen en dos piezas (de arriba y de abajo, una al lado de la otra); si llegan en una sola, `yarn art` la corta por la mitad. Cada parte puede venir de un atuendo distinto y el arma se cambia aparte (`HERO_LOADOUTS`); cada imagen se escala a su largo esperado y las articulaciones se miden en proporción, así que cualquier imagen encaja. Sin sus partes, el héroe usa la imagen entera. En desarrollo, `/dev/art` muestra los títeres con botones de ataque, conjuro y golpe (y cámara lenta).
- **Escenario de batalla** (`(battle)/utils/battleScenery.ts`): el fondo pintado es una malla cuyas filas siguen a la cámara según su profundidad (el cielo casi no se mueve, el suelo se desliza con los luchadores), con una banda de bruma en el horizonte. Cada punto del mapa arma su propio escenario a partir de su id: un clima por bioma (luz, color y partículas: polen, luciérnagas, nieve, brasas, ceniza, polvo, hojas o niebla), objetos lejanos y detrás de los luchadores, manchas en el suelo y siluetas desenfocadas en primer plano. La cámara se balancea despacio y se acerca a cada acción. Los objetos salen de la hoja `props/<bioma>`; mientras no exista, se usan las decoraciones del mapa que están de pie.
- **Sonido**: Howler (`(art)/utils/sound.ts`). Un tema por vez con fundido (menú, mapa por bioma, combate, jefe, Sello, Crisol, victoria y derrota) y efectos por evento de combate (`(battle)/utils/battleSounds.ts`) y del mapa. El botón de parlante (menú y mapa) regula música, efectos y silencio; se guarda en el dispositivo.
- **Offline**: el arte y el audio no se precachean; el service worker los guarda a medida que se usan.

## PWA

Manifest en `/manifest.webmanifest`, service worker de Serwist en `/serwist/sw.js`, página offline `/~offline` e íconos en `public/` (la llama de Crisol en un anillo dorado).

### Google Play (Trusted Web Activity)

La app Android es una TWA (generada con PWABuilder o Bubblewrap) que abre este sitio. Lo que la publicación necesita del lado web:

- `/privacy` (política de privacidad) y `/delete-account` (cómo borrar la cuenta): públicas con o sin sesión (`OPEN_PATHS` en `auth.config.ts`). El email de contacto sale de `CONTACT_EMAIL` (por defecto `support@crisol.app`, ver `app/utils/legal.ts`).
- Borrado de cuenta desde Mi perfil (`POST /api/deleteAccount`, `services/accounts.ts`): se borran el usuario, sus tokens y su partida guardada.
- `/.well-known/assetlinks.json`: se arma con `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_CERT_FINGERPRINTS` (SHA-256 separados por coma, de Play Console → Integridad de la app → Firma de apps).

## Testing

```bash
yarn test
```

- `tests/unit` — diccionarios (mismas claves y placeholders en todos los idiomas), traductor, idiomas y formatos; el mundo (el `world.json` guardado es válido y es el que genera la semilla, el generador es determinístico y la validación detecta mundos rotos), los utilitarios de grafos, las reglas del mapa, la elección entre la copia local y la del servidor, el motor de combate (turnos, daño, afinidades, estados, fases, barras de jefes, reservas, retirada, IA, objetos, bonos y botín), el armado de las peleas, la build de los personajes (puntos, árbol, Lágrimas, canje, armas, runas, ecos, formación) y la economía (resultado de las batallas, bestiario y mercaderes).
- `tests/flows` — contra SQLite en memoria con las migraciones reales: partida guardada (nueva, cargar, guardar, bloqueo optimista, validación del estado, migración, reemplazo) y borrado de cuenta.

## Idiomas (i18n)

La app está disponible en inglés (idioma por defecto) y español. El jugador elige el idioma en **Mi perfil**.

- **Diccionarios**: `app/i18n/messages/es.ts` (referencia de la forma) y `en.ts` (debe tener la misma forma; el compilador y `tests/unit/i18n.test.ts` lo verifican). Las claves se usan con `t('grupo.clave', { param })`; un mensaje `{ one, other }` es un plural que se elige con `count`.
- **Componentes cliente**: `const t = useT()` (o `const { t, locale } = useI18n()`) de `app/i18n/I18nProvider`. **Servidor** (páginas, rutas API): `const t = await getT()` de `app/i18n/server`.
- **Idioma de cada request**: el guardado en el usuario (viaja en la sesión JWT) → cookie `locale` → cabecera `Accept-Language` → inglés.
- **Errores de la API**: `new ApiException('errors.clave', status, params)`; la respuesta los envía traducidos al idioma del request.
- **Agregar un idioma**: sumarlo a `LOCALES`, `LOCALE_NAMES` y `LOCALE_TAGS` (`app/i18n/config.ts`), crear su diccionario y registrarlo en `app/i18n/messages/index.ts`.
