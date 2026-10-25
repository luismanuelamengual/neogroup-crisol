/**
 * Spanish dictionary — the default language and the reference of the others
 * (see en.ts, whose shape must match this one). Keys are grouped by feature.
 * `{name}` placeholders are replaced by the params of `t(key, params)`; a
 * `{ one, other }` message is a plural chosen with `params.count`.
 */
export const es = {
  common: {
    cancel: 'Cancelar',
    close: 'Cerrar',
    loading: 'Cargando...'
  },
  nav: {
    myProfile: 'Mi perfil',
    logout: 'Cerrar sesión'
  },
  metadata: {
    mainMenu: 'Menú principal',
    world: 'El mundo',
    verifyEmail: 'Verificá tu email',
    register: 'Crear cuenta',
    forgotPassword: 'Recuperar contraseña',
    newPassword: 'Nueva contraseña',
    login: 'Ingresar',
    offline: 'Sin conexión',
    profile: 'Mi perfil',
    privacy: 'Política de privacidad',
    deleteAccount: 'Eliminar cuenta'
  },
  pwa: {
    description:
      'RPG de fantasía por turnos: explorá un mundo laberíntico, vencé jefes, rescatá a tus compañeros y bajá al Abismo.',
    installPrompt:
      'Instalá Crisol en tu celular y jugá en pantalla completa, con un ícono en tu pantalla de inicio como cualquier otro juego.',
    install: 'Instalar',
    offlineTitle: 'Sin señal',
    offlineText: 'Crisol necesita internet para esta pantalla. Revisá tu conexión y volvé a intentarlo.'
  },
  landing: {
    tagline: 'Aurenya se apaga. Rescatá a los portadores de la Llama y bajá al Abismo a enfrentar a Crisol.',
    playFree: 'Jugar gratis',
    steps: {
      explore: {
        title: 'Explorá',
        text: 'Más de mil puntos unidos por senderos, nueve biomas y una niebla que solo se disipa avanzando.'
      },
      fight: {
        title: 'Combatí',
        text: 'Batallas por turnos donde manda la velocidad: elegí ataques, especiales y objetivos con cuidado.'
      },
      rise: {
        title: 'Renacé',
        text: 'Cada vez que Crisol cae vuelve más fuerte: Nuevo Juego+ sin fin para seguir mejorando a tu equipo.'
      }
    }
  },
  auth: {
    email: 'Email',
    password: 'Contraseña',
    playerName: 'Nombre de jugador',
    lastName: 'Apellido',
    login: {
      title: 'Iniciar sesión',
      subtitle: '¿Dónde estás? Entrá y demostralo.',
      google: 'Continuar con Google',
      or: 'o',
      verified: 'Tu email fue verificado. Ya podés iniciar sesión.',
      passwordReset: 'Tu contraseña fue actualizada. Ya podés iniciar sesión.',
      invalidCredentials: 'Email o contraseña incorrectos (o la cuenta todavía no fue verificada)',
      submit: 'Ingresar',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tenés cuenta?',
      register: 'Registrate'
    },
    register: {
      title: 'Crear cuenta',
      verifyTitle: 'Verificá tu email',
      verifySent:
        'Te enviamos un enlace de verificación a {email}. Revisá tu bandeja de entrada y hacé clic para activar tu cuenta.',
      alreadyActivated: '¿Ya la activaste?',
      login: 'Ingresar',
      passwordHint: 'Mínimo 6 caracteres',
      repeatPassword: 'Repetir contraseña',
      passwordsMismatch: 'Las contraseñas no coinciden',
      passwordsMismatchDot: 'Las contraseñas no coinciden.',
      submit: 'Crear cuenta',
      haveAccount: '¿Ya tenés cuenta?'
    },
    forgot: {
      title: 'Recuperar contraseña',
      sent: 'Si existe una cuenta asociada a {email}, vas a recibir un correo con instrucciones para restablecer tu contraseña.',
      subtitle: 'Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.',
      submit: 'Enviar enlace',
      back: 'Volver a ingresar'
    },
    reset: {
      title: 'Nueva contraseña',
      newPassword: 'Nueva contraseña',
      confirmPassword: 'Confirmar contraseña',
      submit: 'Guardar contraseña',
      requestNew: 'Pedir un enlace nuevo'
    },
    verify: {
      expiredTitle: 'Enlace vencido',
      expiredText:
        'El enlace de verificación expiró. Registrate nuevamente con el mismo email y te mandamos uno nuevo.',
      invalidTitle: 'Enlace inválido',
      invalidText: 'El enlace de verificación no es válido o ya fue utilizado.',
      title: 'Verificá tu email',
      text: 'Revisá tu bandeja de entrada y hacé clic en el enlace de verificación para activar tu cuenta.',
      registerAgain: 'Registrarme de nuevo'
    },
    resetInvalid: 'El enlace no es válido o ya fue utilizado.',
    goToLogin: 'Ir a ingresar',
    somethingWentWrong: 'Algo salió mal. Intentá de nuevo.',
    emails: {
      verifySubject: 'Activá tu cuenta de Crisol',
      resetSubject: 'Restablecer tu contraseña de Crisol',
      greeting: '¡Hola {name}!',
      verifyIntro: 'Gracias por sumarte a Crisol. Para activar tu cuenta y empezar a jugar, verificá tu email:',
      verifyAction: 'Verificar mi email',
      verifyFooter: 'El enlace es válido por {hours} horas. Si no creaste esta cuenta, ignorá este mensaje.',
      resetIntro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Crisol.',
      resetAction: 'Restablecer contraseña',
      resetFooter: 'El enlace es válido por {hours} hora. Si no pediste este cambio, ignorá este mensaje.'
    }
  },
  account: {
    profile: 'Mi perfil',
    playerNameTitle: 'Nombre de jugador',
    lastNameTitle: 'Apellido',
    nicknameTitle: 'Apodo',
    nicknameHint: 'Si tenés apodo, se muestra en lugar de tu nombre y apellido',
    save: 'Guardar',
    saved: '¡Perfil actualizado!',
    languageLabel: 'Idioma de la aplicación',
    delete: {
      section: 'Eliminar cuenta',
      description: 'Se borran tu cuenta, tu nombre de jugador, tu email y tu partida guardada. No se puede deshacer.',
      button: 'Eliminar mi cuenta',
      title: '¿Eliminar tu cuenta?',
      warning:
        'Se van a borrar para siempre tu cuenta y tu partida guardada, con todos tus personajes. Esto no se puede deshacer.',
      confirmWord: 'ELIMINAR',
      confirmLabel: 'Escribí {word} para confirmar',
      confirm: 'Eliminar para siempre'
    }
  },
  legal: {
    privacyLink: 'Política de privacidad',
    updatedAt: 'Última actualización: {date}',
    privacy: {
      title: 'Política de privacidad',
      intro:
        'Crisol es un juego de rol de fantasía por turnos para un jugador. Esta política explica qué datos guardamos, para qué los usamos y cómo podés borrarlos.',
      data: {
        title: 'Qué datos guardamos',
        text: 'Al crear tu cuenta: tu email, tu nombre de jugador y tu contraseña (guardada cifrada, nunca en texto plano). Si entrás con Google, recibimos de Google tu email y tu nombre. También guardamos el idioma que elegís y tu partida guardada: tus personajes, tu avance en el mapa, tus objetos y tu tiempo de juego.'
      },
      use: {
        title: 'Para qué los usamos',
        text: 'Solo para que el juego funcione: iniciar sesión, guardar tu partida para que la continúes en cualquier dispositivo, y mandarte los emails de verificación de cuenta y de recuperación de contraseña. No vendemos tus datos.'
      },
      thirdParties: {
        title: 'Servicios de terceros',
        text: 'Usamos Google para el inicio de sesión con Google y las estadísticas de uso de la app (Google Analytics a través de Google Tag Manager); Vercel para alojar la aplicación; un proveedor de bases de datos PostgreSQL para guardar los datos; y Resend para enviar los emails. Cada uno trata los datos según su propia política de privacidad.'
      },
      storage: {
        title: 'Cookies y almacenamiento',
        text: 'Usamos una cookie para mantener tu sesión iniciada y otra para recordar tu idioma. El almacenamiento local del navegador guarda una copia de tu partida para poder jugar sin conexión y preferencias del dispositivo, como haber cerrado el aviso de instalación.'
      },
      retention: {
        title: 'Cuánto tiempo los guardamos',
        text: 'Tu cuenta y tu partida guardada se conservan hasta que las elimines. Empezar una partida nueva reemplaza la anterior.'
      },
      deletion: {
        title: 'Cómo borrar tus datos',
        text: 'Podés eliminar tu cuenta cuando quieras desde Mi perfil → Eliminar cuenta: se borran tu cuenta y tu partida guardada en el momento. Si no podés entrar, escribinos a {email} desde el email de tu cuenta y la borramos nosotros.'
      },
      security: {
        title: 'Seguridad',
        text: 'Toda la comunicación con Crisol viaja cifrada (HTTPS) y las contraseñas se guardan con un hash seguro (bcrypt).'
      },
      children: {
        title: 'Menores',
        text: 'Crisol no está dirigido a menores de 13 años y no recolectamos a sabiendas datos de menores de esa edad. Si creés que un menor nos dio sus datos, escribinos a {email} y los borramos.'
      },
      changes: {
        title: 'Cambios y contacto',
        text: 'Si cambiamos esta política, vamos a actualizar la fecha de arriba. Para cualquier consulta sobre tus datos escribinos a {email}.'
      }
    },
    deleteAccount: {
      title: 'Eliminar tu cuenta de Crisol',
      intro: 'Podés eliminar tu cuenta y todos tus datos desde la app, en cualquier momento:',
      steps: {
        signIn: 'Entrá a Crisol con tu cuenta.',
        profile: 'Abrí el menú de tu jugador y elegí Mi perfil.',
        confirm: 'Tocá Eliminar mi cuenta y confirmá escribiendo ELIMINAR.'
      },
      whatTitle: 'Qué se borra',
      whatText:
        'Se borran en el momento y para siempre tu cuenta (email, nombre de jugador y contraseña) y tu partida guardada, con todos tus personajes. No guardamos ninguna copia.',
      noAccessTitle: '¿No podés entrar?',
      noAccessText: 'Escribinos a {email} desde el email de tu cuenta pidiendo que la borremos y lo hacemos nosotros.',
      goToProfile: 'Ir a Mi perfil'
    }
  },
  home: {
    tagline: 'Aurenya se apaga. Solo la Llama Primera puede detener a Crisol.',
    continue: 'Continuar',
    newGame: 'Nuevo',
    cycle: 'NG+{cycle}',
    saveCharacters: { one: '{count} personaje', other: '{count} personajes' },
    saveLevel: 'Nivel {level}',
    newGameConfirm: {
      title: '¿Empezar una partida nueva?',
      text: 'Se borra tu partida guardada, con todos tus personajes y su avance. No se puede deshacer.',
      confirm: 'Empezar de nuevo'
    }
  },
  world: {
    title: 'Aurenya',
    level: 'Nivel {level}',
    levelShort: 'Nv. {level}',
    backToMenu: 'Volver al menú',
    menu: 'Menú',
    gold: 'Oro',
    missing: 'No tenés una partida guardada.',
    offlineNoCopy: 'Sin conexión, y este dispositivo no tiene una copia de tu partida.',
    camps: {
      start: 'Claro del Despertar',
      lair: 'Guarida de {name}',
      miniboss: 'Campamento {number} de {biome}'
    },
    biomes: {
      meadows: 'Praderas',
      forest: 'Bosques',
      tropical: 'Tropical',
      desert: 'Desiertos',
      mountains: 'Montañoso',
      snow: 'Nevado',
      volcanic: 'Volcánica',
      wastelands: 'Yermos',
      abyss: 'Abismo'
    },
    bosses: {
      morgrath: { name: 'Morgrath', title: 'Morgrath, la Bruja del Musgo' },
      sahrak: { name: 'Sahrak', title: 'Sahrak, el Rey Escorpión' },
      vorneth: { name: 'Vorneth', title: 'Vorneth, el Wyrm de Escarcha' },
      ignaroth: { name: 'Ignaroth', title: 'Ignaroth, Señor de la Ceniza' },
      xalqui: { name: 'Xalqui', title: 'Xalqui, la Serpiente de Jade' },
      colossus: { name: 'el Coloso', title: 'El Coloso de Basalto' },
      vael: { name: 'Vael', title: 'Vael, el Caballero Hueco' }
    },
    merchants: {
      peddler: 'Buhonero',
      alchemist: 'Alquimista',
      smith: 'Herrera',
      scholar: 'Erudito',
      threshold: 'Mercader del Umbral'
    },
    points: {
      combat: 'Combate',
      cleared: 'Camino despejado',
      respawned: 'Los enemigos volvieron',
      miniboss: 'Minijefe de {biome}',
      sanctuary: 'Santuario de runa',
      sanctuaryTaken: 'Santuario (runa obtenida)',
      tear: 'Lágrima del Olvido',
      tearTaken: 'Lágrima del Olvido (obtenida)',
      chest: 'Cofre',
      chestOpened: 'Cofre abierto',
      gate: 'Puerta del Abismo',
      gateSealed: { one: 'Sellada: falta {count} Sello', other: 'Sellada: faltan {count} Sellos' },
      crisol: 'Crisol'
    },
    encounters: {
      combat: 'Combate',
      elite: 'Combate de élite',
      guardian: 'Guardián del santuario',
      miniboss: 'Minijefe',
      captor: 'Captor',
      seal: 'Sello del Abismo',
      crisol: 'Jefe final'
    },
    panel: {
      go: 'Ir',
      here: 'Estás acá',
      noRoute: 'Todavía no hay un camino despejado hasta acá.',
      rest: 'Descansar',
      rested: 'Descansaste: el grupo y el Frasco se recuperaron, y los enemigos comunes volvieron.',
      teleport: 'Viajar',
      teleportTitle: 'Viajar a otro campamento',
      shop: 'Tienda'
    },
    flask: {
      name: 'Frasco de Ámbar',
      drink: 'Beber',
      heals: 'Cura el {potency}% de la vida a todo el grupo',
      empty: 'El Frasco está vacío: descansá en un campamento para llenarlo.',
      full: 'El grupo ya tiene la vida llena.'
    },
    rewards: {
      camp: '¡Campamento ganado: {name}!',
      character: '¡{name} se une al grupo en el nivel {level}!',
      flaskCharge: 'El Frasco de Ámbar ahora tiene {max} cargas',
      flaskPotency: 'El Frasco de Ámbar ahora cura el {potency}%',
      rune: 'Obtuviste la {name} ({tier})',
      item: '+{count} {name}',
      echoes: { one: 'Encontraste un Eco', other: 'Encontraste {count} Ecos' },
      tear: 'Encontraste una Lágrima del Olvido',
      gold: '+{amount} de oro',
      abyssOpen: 'Los tres Sellos cayeron: la Puerta del Abismo se abrió',
      crisol: '¡Crisol cayó! El Nuevo Juego+ llega en una próxima fase.',
      defeat: 'Tu grupo cayó. Despertás en {camp}.'
    },
    runeTiers: {
      lesser: 'menor',
      greater: 'mayor',
      ancestral: 'ancestral',
      abyssal: 'abisal'
    },
    sync: {
      synced: 'Partida guardada',
      pending: 'Guardada en este dispositivo',
      syncing: 'Sincronizando...',
      offline: 'Sin conexión: guardada en este dispositivo',
      localDiscarded: 'Tu partida avanzó en otro dispositivo: se cargó esa versión.',
      serverDiscarded: 'Esta copia tenía más tiempo de juego que la de otro dispositivo: se mantuvo esta.'
    }
  },
  battle: {
    items: 'Objetos',
    noItems: 'No hay objetos para usar',
    chooseAlly: 'Elegí un aliado',
    lootTitle: 'Botín',
    attack: 'Atacar',
    specials: 'Especiales',
    retreat: 'Retirarse',
    chooseTarget: 'Elegí un objetivo',
    back: 'Volver',
    focusCost: '{cost} conc.',
    focus: 'Conc.',
    speed: 'Velocidad ×{speed}',
    phase: 'Fase {phase} de {total}',
    enemyTurn: 'Turno enemigo',
    weak: '¡Débil!',
    resist: 'Resiste',
    immune: 'Inmune',
    miss: 'Falla',
    transform: '¡Se transforma!',
    victory: '¡Victoria!',
    defeat: 'Tu grupo cayó',
    defeatText:
      'Perdés la mitad de la experiencia de tu nivel actual y despertás en el último campamento donde descansaste.',
    retreated: 'Te retiraste',
    retreatText: 'Los que pelearon pierden el 10% de la experiencia de su nivel actual.',
    xpGained: '+{xp} de experiencia',
    goldGained: '+{gold} de oro',
    levelUp: '{name} sube al nivel {level}',
    continue: 'Continuar',
    elite: '{name} de élite',
    champion: 'Campeón: {name}',
    guardian: 'Guardián: {name}'
  },
  statuses: {
    poison: 'Veneno',
    burn: 'Quemadura',
    bleed: 'Sangrado',
    freeze: 'Congelado',
    stun: 'Aturdido',
    blind: 'Ceguera',
    attackUp: 'Ataque ▲',
    attackDown: 'Ataque ▼',
    defenseUp: 'Defensa ▲',
    defenseDown: 'Defensa ▼',
    speedUp: 'Velocidad ▲',
    speedDown: 'Velocidad ▼'
  },
  skills: {
    'kael-strike': 'Tajo',
    'kael-firm-cut': 'Corte Firme',
    'kael-flame-edge': 'Filo de Llama',
    'kael-sweep': 'Barrido',
    'kael-guard': 'Guardia',
    'sera-shot': 'Disparo',
    'sera-piercing-arrow': 'Flecha Perforante',
    'sera-volley': 'Andanada',
    'sera-blinding-arrow': 'Flecha Cegadora',
    'brann-chop': 'Hachazo',
    'brann-cleave': 'Tajo Brutal',
    'brann-earthsplitter': 'Parte Tierra',
    'brann-roar': 'Rugido',
    'oren-staff': 'Bastonazo',
    'oren-mend': 'Savia',
    'oren-grove': 'Arboleda',
    'oren-thorns': 'Espinas',
    'ysolde-rod': 'Golpe de Báculo',
    'ysolde-fireball': 'Bola de Fuego',
    'ysolde-frost-lance': 'Lanza de Escarcha',
    'ysolde-chain-lightning': 'Cadena de Rayos',
    claw: 'Zarpazo',
    gore: 'Cornada',
    bite: 'Mordida',
    lunge: 'Embestida',
    'venom-bite': 'Mordida Venenosa',
    rend: 'Desgarro',
    bash: 'Golpe',
    harden: 'Endurecer',
    peck: 'Picotazo',
    mend: 'Sanar',
    hex: 'Maleficio',
    slam: 'Sacudida',
    roar: 'Bramido',
    'fire-bolt': 'Saeta de Fuego',
    'fire-wave': 'Ola de Fuego',
    'ice-bolt': 'Saeta de Hielo',
    'ice-wave': 'Ventisca',
    'lightning-bolt': 'Rayo',
    'lightning-wave': 'Tormenta',
    'earth-bolt': 'Piedra',
    'earth-wave': 'Temblor',
    'light-bolt': 'Destello',
    'light-wave': 'Aurora',
    'darkness-bolt': 'Sombra Punzante',
    'darkness-wave': 'Marea Oscura'
  },
  enemies: {
    'thorn-boar': 'Jabalí Espinado',
    'road-bandit': 'Bandido de Camino',
    'wheat-spirit': 'Espíritu del Trigo',
    'hedge-sprite': 'Duende del Seto',
    'shadow-wolf': 'Lobo Sombrío',
    'rotten-ent': 'Ent Podrido',
    'weaver-spider': 'Araña Tejedora',
    'jade-viper': 'Víbora de Jade',
    'fungal-shaman': 'Chamán Hongo',
    'toxic-frog': 'Rana Tóxica',
    'giant-scorpion': 'Escorpión Gigante',
    'wandering-mummy': 'Momia Errante',
    'sand-worm': 'Gusano de Arena',
    'rock-golem': 'Gólem de Roca',
    harpy: 'Harpía',
    'renegade-dwarf': 'Enano Renegado',
    yeti: 'Yeti',
    'frost-wolf': 'Lobo de Escarcha',
    'ice-wisp': 'Espíritu Helado',
    salamander: 'Salamandra',
    'magma-elemental': 'Elemental de Magma',
    'young-dragon': 'Dragón Joven',
    ghoul: 'Necrófago',
    'bone-knight': 'Caballero de Hueso',
    devourer: 'Devorador',
    'crucible-horror': 'Horror del Crisol',
    'castle-warden': 'Guardia del Castillo',
    'abyss-eye': 'Ojo del Abismo',
    'boar-matriarch': 'Matriarca Espinada',
    'bandit-chief': 'Jefe de los Bandidos',
    morgrath: 'Morgrath, la Bruja del Musgo',
    sahrak: 'Sahrak, el Rey Escorpión',
    vorneth: 'Vorneth, el Wyrm de Escarcha',
    ignaroth: 'Ignaroth, Señor de la Ceniza',
    xalqui: 'Xalqui, la Serpiente de Jade',
    colossus: 'El Coloso de Basalto',
    vael: 'Vael, el Caballero Hueco',
    crisol: 'Crisol'
  },
  party: {
    title: 'Grupo',
    open: 'Grupo',
    heroes: 'Héroes',
    inventory: 'Inventario',
    bestiary: 'Bestiario',
    formation: 'Formación',
    formationHint: 'Los tres primeros pelean; el resto espera en reserva y entra junto cuando caen los tres.',
    active: 'Activo',
    reserve: 'Reserva',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    pointsBadge: 'Puntos para gastar',
    campOnly: 'El arma, las runas y los ecos se cambian en un campamento.',
    attributes: 'Atributos',
    attributePoints: { one: '{count} punto de atributo', other: '{count} puntos de atributo' },
    spendPoint: 'Sumar un punto a {stat}',
    skills: 'Árbol de habilidades',
    skillPoints: { one: '{count} punto de habilidad', other: '{count} puntos de habilidad' },
    buy: 'Aprender · {cost}',
    bought: 'Aprendida',
    locked: 'Primero aprendé la anterior',
    trade: 'Canjear un punto por {count} Ecos',
    tradeHint: 'El árbol está completo: cada punto de habilidad nuevo puede volverse Ecos de este personaje.',
    tears: { one: '{count} Lágrima del Olvido', other: '{count} Lágrimas del Olvido' },
    spendTear: 'Usar una Lágrima: devuelve todos los puntos de habilidad',
    weapon: 'Arma',
    weaponLevel: 'Arma +{level}',
    weaponPower: '+{value} de poder de ataque y especial',
    upgrade: 'Mejorar a +{level}',
    upgradeCost: '{stones} × {stone} · {gold} de oro',
    weaponMax: 'El arma está al máximo.',
    weaponNext: 'En +{level}: {effect}',
    runes: 'Runas',
    runeSlots: '{used} de {total} espacios',
    noRunes: 'Todavía no tenés runas: cada santuario guarda una.',
    equip: 'Equipar',
    unequip: 'Quitar',
    wornBy: 'La lleva {name}',
    mastery: 'Dominio {wins}/{needed}',
    mastered: 'Dominada',
    echoes: 'Ecos',
    echoCapacity: 'Ecos {used} de {capacity}',
    echoesHint: 'El eco de una runa dominada da su efecto sin sus cambios de atributos.',
    noEchoes: 'Dominá una runa (4 batallas ganadas con ella puesta) para equipar su eco.',
    echoPool: { one: '{count} Eco para asignar', other: '{count} Ecos para asignar' },
    assign: 'Asignar 1 a {name}',
    assignHint: 'Asignar Ecos a un personaje es para siempre.',
    cost: { one: '{count} Eco', other: '{count} Ecos' },
    have: 'tenés {count}',
    empty: 'Todavía no hay nada.',
    consumables: 'Pociones y bombas',
    stones: 'Piedras de herrería',
    owned: '× {count}',
    bestiaryHint: 'Derrotá más de cada especie para saber más sobre ella.',
    kills: { one: '{count} derrotado', other: '{count} derrotados' },
    unknown: '???',
    nextUnlock: 'Más a las {count}',
    weakTo: 'Débil a {types}',
    resists: 'Resiste {types}',
    immuneTo: 'Inmune a {types}',
    absorbs: 'Absorbe {types}',
    noWeakness: 'Sin debilidades',
    archetype: 'Tipo: {archetype}',
    statsLine: 'Vida {health} · Ataque {attack} · Defensa {defense} · Velocidad {speed} (nivel {level})',
    skillsLine: 'Habilidades: {skills}',
    dropsLine: 'Deja: {items}'
  },
  attributes: {
    maxHealth: 'Vida',
    maxFocus: 'Concentración',
    defense: 'Defensa',
    speed: 'Velocidad',
    attack: 'Ataque',
    special: 'Ataque especial',
    critChance: 'Prob. de crítico',
    critDamage: 'Daño crítico'
  },
  archetypes: {
    brute: 'Bruto',
    agile: 'Ágil',
    tank: 'Tanque',
    caster: 'Lanzador',
    healer: 'Sanador'
  },
  damageTypes: {
    slash: 'Corte',
    pierce: 'Perforante',
    blunt: 'Contundente',
    fire: 'Fuego',
    ice: 'Hielo',
    lightning: 'Rayo',
    earth: 'Tierra',
    light: 'Luz',
    darkness: 'Oscuridad'
  },
  targets: {
    enemy: 'un enemigo',
    allEnemies: 'todos los enemigos',
    ally: 'un aliado',
    allAllies: 'todos los aliados',
    self: 'sí mismo'
  },
  bonuses: {
    stat: '{value} {stat}',
    lifesteal: 'Se cura el {value} del daño que hace',
    focusRegen: '+{value} de concentración por turno',
    regen: 'Recupera el {value} de la vida por turno',
    initiative: 'Empieza las batallas un {value}% adelantado en los turnos',
    guard: 'Recibe un {value} menos de daño',
    damage: '{value} de daño de {type}',
    weakness: '{value} de daño sobre debilidades',
    statusChance: '{value} de probabilidad de sus estados',
    onHit: 'Sus ataques pueden causar {status} ({value})',
    power: '{skill}: +{value} de poder',
    skillCost: '{skill}: {value} menos de concentración',
    skillStatus: '{skill}: +{value} de probabilidad de sus estados',
    skill: 'Especial nuevo: {skill} ({info})',
    skillInfo: '{cost} de conc. · {target} · {type}'
  },
  talents: {
    branches: {
      kael: { b0: 'Filo', b1: 'Baluarte', b2: 'Brasa' },
      sera: { b0: 'Caza', b1: 'Viento', b2: 'Sombra' },
      brann: { b0: 'Furia', b1: 'Piedra', b2: 'Tierra' },
      oren: { b0: 'Savia', b1: 'Arboleda', b2: 'Espina' },
      ysolde: { b0: 'Fuego', b1: 'Hielo', b2: 'Tormenta' }
    },
    'kael-sharpness': 'Filo afilado',
    'kael-precision': 'Precisión',
    'kael-deep-cut': 'Corte profundo',
    'kael-toughness': 'Aguante',
    'kael-steady-guard': 'Guardia firme',
    'kael-bulwark': 'Baluarte',
    'kael-kindling': 'Yesca',
    'kael-searing-edge': 'Filo abrasador',
    'kael-ember-heart': 'Corazón de brasa',
    'sera-keen-eye': 'Ojo agudo',
    'sera-deadly-aim': 'Puntería letal',
    'sera-hunter': 'Cazadora',
    'sera-light-step': 'Paso ligero',
    'sera-rain': 'Lluvia de flechas',
    'sera-venom-tips': 'Puntas envenenadas',
    'sera-shadow-veil': 'Velo de sombra',
    'brann-might': 'Poderío',
    'brann-bloodlust': 'Sed de sangre',
    'brann-thick-hide': 'Piel gruesa',
    'brann-iron-skin': 'Piel de hierro',
    'brann-unyielding': 'Inquebrantable',
    'brann-tremor': 'Temblor',
    'brann-quake': 'Terremoto',
    'oren-deep-roots': 'Raíces hondas',
    'oren-fresh-sap': 'Savia fresca',
    'oren-wellspring': 'Manantial',
    'oren-bark': 'Corteza',
    'oren-renewal': 'Renuevo',
    'oren-venom': 'Ponzoña',
    'oren-briar': 'Zarzal',
    'ysolde-pyromancy': 'Piromancia',
    'ysolde-firestorm': 'Tormenta de fuego',
    'ysolde-arcane-mind': 'Mente arcana',
    'ysolde-cryomancy': 'Criomancia',
    'ysolde-deep-freeze': 'Congelación profunda',
    'ysolde-static': 'Estática',
    'ysolde-focus': 'Foco'
  },
  runes: {
    name: 'Runa {family} {rank}',
    families: {
      leech: 'de la Sanguijuela',
      ember: 'de la Brasa',
      wellspring: 'del Manantial',
      edge: 'del Filo',
      ward: 'del Resguardo',
      frost: 'de la Escarcha',
      vigor: 'del Vigor',
      haste: 'de la Prisa',
      venom: 'del Veneno',
      fury: 'de la Furia',
      storm: 'de la Tormenta',
      hunter: 'del Cazador'
    }
  },
  items: {
    'health-potion': { name: 'Poción de vida', text: 'Cura el 35% de la vida de un aliado.' },
    'focus-potion': { name: 'Poción de concentración', text: 'Devuelve la mitad de la concentración de un aliado.' },
    antidote: {
      name: 'Antídoto',
      text: 'Cura veneno, quemaduras, sangrado, ceguera, congelación, aturdimiento y debilitamientos.'
    },
    'fire-bomb': { name: 'Bomba de fuego', text: 'Daño de fuego a todos los enemigos.' },
    'greater-health-potion': { name: 'Poción de vida mayor', text: 'Cura el 70% de la vida de un aliado.' },
    'greater-focus-potion': {
      name: 'Poción de concentración mayor',
      text: 'Devuelve toda la concentración de un aliado.'
    },
    'revive-potion': { name: 'Poción de revivir', text: 'Levanta a un aliado caído con el 40% de su vida.' },
    'frost-bomb': { name: 'Bomba de escarcha', text: 'Daño de hielo a todos los enemigos, que puede congelarlos.' },
    elixir: { name: 'Elixir', text: 'Cura a todo el grupo, devuelve su concentración y quita sus estados.' },
    'rough-stone': { name: 'Piedra tosca', text: 'Mejora un arma de +1 a +5.' },
    'tempered-stone': { name: 'Piedra templada', text: 'Mejora un arma de +6 a +10.' },
    'arcane-stone': { name: 'Piedra arcana', text: 'Mejora un arma de +11 a +15.' },
    'abyssal-stone': { name: 'Piedra abisal', text: 'Mejora un arma de +16 a +20.' }
  },
  shop: {
    gold: '{gold} de oro',
    buy: 'Comprar · {price}',
    full: 'Ya llevás el máximo',
    echo: 'Un Eco',
    echoText: 'Va al fondo común, para asignarlo a un personaje para siempre.',
    echoesLeft: { one: 'Queda {count} en este ciclo', other: 'Quedan {count} en este ciclo' },
    soldOut: 'No hay más Ecos hasta el próximo ciclo.'
  },
  characters: {
    kael: { name: 'Kael' },
    sera: { name: 'Sera' },
    brann: { name: 'Brann' },
    oren: { name: 'Oren' },
    ysolde: { name: 'Ysolde' }
  },
  errors: {
    internal: 'Error interno',
    notAuthenticated: 'Usuario no autenticado',
    unauthorized: 'No autorizado',
    playerNameRequired: 'Elegí un nombre de jugador',
    playerNameTooLong: 'El nombre de jugador puede tener hasta 40 caracteres',
    lastNameTooLong: 'El apellido puede tener hasta 40 caracteres',
    nicknameTooLong: 'El apodo puede tener hasta 40 caracteres',
    invalidLocale: 'Idioma inválido',
    saveNotFound: 'No tenés una partida guardada',
    invalidSave: 'La partida guardada no es válida',
    saveOutdated: 'Tu partida avanzó en otro dispositivo: volvé a cargarla',
    emailRequired: 'Ingresá tu email',
    invalidEmail: 'El email no es válido',
    passwordTooShort: 'La contraseña debe tener al menos {min} caracteres',
    emailAlreadyRegistered: 'El email ya está registrado',
    fillAllFields: 'Completá todos los campos',
    linkInvalidOrUsed: 'El enlace no es válido o ya fue usado',
    linkExpired: 'El enlace expiró. Pedí uno nuevo'
  }
}

export type Messages = typeof es
