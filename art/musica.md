# Música y efectos de sonido

## Dónde van los archivos

- Música: `art/source/music/<nombre>.mp3` (u `.ogg`, o los dos).
- Efectos (opcional): `art/source/sfx/<nombre>.mp3`. Un efecto sin archivo se sintetiza por código (`app/(protected)/(art)/utils/sfxSynth.ts`); un archivo con el mismo nombre lo reemplaza.
- Después: `yarn art`. Copia el audio a `public/audio/` y lo anota en `public/art/manifest.json`, y lista la música que falta.
- Para escuchar todo: `/dev/sounds` (solo en desarrollo).

Una pista que falta queda en silencio; no rompe nada.

## Pistas

| Archivo | Dónde suena | Qué buscar |
|---|---|---|
| `menu` | Menú principal | Orquestal, melancólico y épico; piano o cuerdas |
| `map-meadows` | Praderas | Pastoral, alegre, tranquilo (flauta, arpa) |
| `map-forest` | Bosque | Místico, celta o folk |
| `map-tropical` | Selva tropical | Percusión de mano, marimba, aventura |
| `map-desert` | Desierto | Escala árabe (oud, darbuka), misterio |
| `map-mountains` | Montañas | Épico de altura, cornos, tambores lejanos |
| `map-snow` | Nieve | Frío y etéreo (celesta, campanitas, pads) |
| `map-volcanic` | Volcán | Oscuro, tenso, percusión pesada |
| `map-wastelands` | Tierras baldías | Desolado, ambiental, ruinas |
| `map-abyss` | Abismo (zona final) | Dark ambient, coros, inquietante |
| `battle` | Combates y élites | Orquestal con ritmo, 130–160 BPM |
| `boss` | Guardianes, minijefes, carceleros | Épico e intenso, coros y percusión |
| `seal` | Sellos y puertas | Solemne, ceremonial, oscuro |
| `crisol` | Jefe final | El más épico: coros y órgano |
| `victory` | Victoria (una vez) | Fanfarria corta, 5–20 s, sin loop |
| `defeat` | Derrota (una vez) | Tema corto y triste, 5–20 s, sin loop |

## Formato

- MP3 128 kbps (96 alcanza), 44.1 kHz, estéreo: suena en todos lados, iPhone incluido.
- OGG Vorbis loopea sin corte y anda en Android y Chrome; si hay `.ogg` y `.mp3` del mismo nombre, el juego usa OGG donde se puede y MP3 en el resto.
- Las pistas que loopean, de 1:30 a 3:00 y menos de 3 MB. Buscar las marcadas "loop" o "seamless".
- Si una pista suena más fuerte que las demás: `MUSIC_LEVELS` en `app/(protected)/(art)/data/audio.ts` (por ejemplo `boss: 0.7`).

## Licencias

- CC0: ideal, no pide nada.
- CC-BY 3.0 / 4.0: sirve, con crédito.
- Evitar NC (no comercial), GPL y CC-BY-SA.
- Anotar cada pista en `art/source/music/CREDITOS.md`: título, autor, URL de OpenGameArt y licencia.

## Cómo funciona

- Un solo contexto Web Audio con volumen de música, de efectos y mute (`utils/sound.ts`). Se guardan en el dispositivo.
- El navegador bloquea el audio hasta el primer toque o tecla: ahí arranca solo. En segundo plano todo se pausa.
- Un tema entra con crossfade sobre el anterior. El tema del mapa (o del menú) queda pausado durante una batalla y sigue donde estaba al volver (hasta 3 minutos).
- La música se transmite desde un `<audio>` (no se carga entera en memoria) y pasa por el contexto, así el volumen funciona también en iPhone.
- Los clicks de botones y el sonido de abrir/cerrar ventanas son globales (`utils/uiSounds.ts`); un elemento con `data-silent` no hace click.
