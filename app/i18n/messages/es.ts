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
      shopSoon: 'La tienda abre en una próxima fase.'
    },
    flask: {
      name: 'Frasco de Ámbar',
      drink: 'Beber',
      heals: 'Cura el {potency}% de la vida a todo el grupo',
      empty: 'El Frasco está vacío: descansá en un campamento para llenarlo.',
      full: 'El grupo ya tiene la vida llena.'
    },
    battle: {
      title: '{kind} · Nivel {level}',
      placeholder: 'El combate llega en la fase 4. Por ahora elegís cómo termina.',
      win: 'Ganar',
      lose: 'Perder',
      retreat: 'Retirarse',
      noRetreat: 'No se puede huir de un jefe.'
    },
    rewards: {
      camp: '¡Campamento ganado: {name}!',
      character: '¡{name} se une al grupo en el nivel {level}!',
      flaskCharge: 'El Frasco de Ámbar ahora tiene {max} cargas',
      flaskPotency: 'El Frasco de Ámbar ahora cura el {potency}%',
      rune: 'Obtuviste la runa {index} ({tier})',
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
