/**
 * What each creature looks like, for its prompt (see catalog.ts). In Spanish,
 * like every prompt of the catalog.
 */
export const ENEMY_LOOKS: Record<string, string> = {
  // Meadows
  'thorn-boar':
    'un jabalí grande y redondo de pelaje marrón esponjoso, hocico gruñón, dos colmillos curvos cortos y una hilera de pequeñas espinas de madera sobre el lomo',
  'road-bandit':
    'un salteador de caminos humano y fibroso con capucha remendada y jubón de cuero, dos dagas cortas y un pañuelo sobre la boca',
  'wheat-spirit':
    'un espíritu flotante tejido con tallos de trigo dorado, una cara hueca de paja y ojos ámbar brillantes',
  'hedge-sprite':
    'un hada diminuta con alas, hecha de hojas y ramitas de seto, con una varita espinosa que brilla en verde',
  'field-rat':
    'una rata de campo enorme de pelaje gris desaliñado, grandes dientes de conejo y una cola larga y escamosa',
  scarecrow: 'un espantapájaros vivo de arpillera y paja sobre un palo de madera, una sonrisa cosida y una hoz oxidada',
  'meadow-wasp':
    'una avispa del tamaño de un perro con rayas amarillas y negras, alas translúcidas y un aguijón grande y puntiagudo',
  'bandit-archer': 'un arquero bandido humano y delgado con capucha verde y brazales de cuero, tensando un arco corto',
  'giant-toad': 'un sapo marrón enorme y verrugoso, de boca ancha, ojos saltones y glándulas de veneno en el lomo',
  // Forests
  'shadow-wolf':
    'un lobo negro hecho a medias de humo, ojos violetas brillantes y jirones de sombra que salen de su pelaje',
  'rotten-ent':
    'un árbol caminante encorvado de madera vieja y retorcida, cubierto de hongos y musgo, con ojos huecos brillantes',
  'weaver-spider':
    'una araña gigante violeta del bosque con patas peluditas, ocho ojos brillantes y un hilo de seda que cuelga detrás',
  'thorn-dryad': 'una dríada esbelta con piel de corteza, enredaderas espinosas por cabello y un báculo de madera viva',
  'bog-wight':
    'un espectro del pantano larguirucho cubierto de algas, con un farol de fuego verde de bruja en su mano larga',
  'moss-bear': 'un oso marrón enorme con musgo y pequeños helechos creciéndole en el lomo y los hombros',
  'forest-goblin': 'un pequeño goblin verde con capa de hojas, una lanza tosca y una sonrisa traviesa',
  'cursed-stag': 'un ciervo negro y flaco con astas enormes envueltas en niebla oscura y ojos rojos brillantes',
  'creeping-vine':
    'una masa retorcida de enredaderas gruesas y espinosas que sale del suelo con una flor dentada en la punta',
  // Tropical
  'jade-viper': 'una víbora larga verde esmeralda con escamas de jade, cabeza con capuchón y dos colmillitos',
  'fungal-shaman':
    'un hombre-hongo bajito con un sombrero magenta ancho y con lunares, cuentas de madera y un báculo de esporas brillante',
  'toxic-frog': 'una rana dardo venenosa del tamaño de un perro, piel azul neón y amarilla que brilla de veneno',
  'jungle-panther': 'una pantera negra y elegante con rosetas de jade tenues en el pelaje y ojos amarillos brillantes',
  'giant-mosquito': 'un mosquito gigante con una trompa larga como una aguja, abdomen rojo y redondo y alas zumbantes',
  'carnivorous-plant':
    'una planta carnívora enorme con una vaina dentada abierta por cabeza y zarcillos de enredadera que agarran',
  'lizard-warrior':
    'un guerrero hombre-lagarto musculoso de escamas verdes, con lanza de hueso y escudo de guerra con plumas',
  'mangrove-croc':
    'un cocodrilo de pantano enorme con escamas acorazadas cubiertas de musgo e hileras de dientes dentados',
  'tribal-witch':
    'una vieja bruja de la selva con plumas y máscaras de madera pintada, un báculo coronado por una calabaza brillante y tatuajes brillantes',
  // Deserts
  'giant-scorpion':
    'un escorpión gigante del desierto con caparazón color arena, pinzas enormes y una cola curva con veneno',
  'wandering-mummy':
    'una momia que arrastra los pies, con vendas sueltas que se desenrollan, ojos azules brillantes y amuletos de oro',
  'sand-worm': 'un gusano de arena colosal que sale de las dunas, con una boca redonda de dientes en espiral',
  'dune-raider': 'un saqueador del desierto con túnicas sueltas color arena y velo en la cara, con una cimitarra curva',
  'sun-priest':
    'un sacerdote del desierto con túnica, máscara de sol dorada y un báculo coronado por un disco solar brillante',
  'desert-djinn':
    'un djinn de piel azul cuya mitad inferior es una tormenta de arena en remolino, brazaletes de oro y ojos ardientes',
  vulture: 'un buitre calvo enorme de plumas oscuras desordenadas, pico ganchudo y cuello rojo pelado',
  'tomb-guardian':
    'una estatua guerrera alta de piedra con cabeza de chacal y alabarda dorada, con grietas que brillan con luz azul',
  'scarab-swarm': 'un enjambre de cientos de escarabajos negros y dorados que forman una figura vagamente humana',
  // Mountains
  'rock-golem': 'un gólem pesado de rocas grises unidas por runas brillantes, con enormes puños de piedra',
  harpy: 'una arpía con cara pálida de mujer, alas de plumas marrones en lugar de brazos y patas con garras afiladas',
  'renegade-dwarf':
    'un guerrero enano robusto con barba roja trenzada, armadura de hierro abollada y un martillo de guerra',
  'mountain-troll': 'un trol de montaña gris altísimo con piel de roca y un tronco de árbol partido como garrote',
  'storm-eagle': 'un águila gigante de plumas gris tormenta que chisporrotean con rayos azules',
  'crystal-sprite': 'un pequeño duende flotante hecho de esquirlas de cristal cian que refractan la luz',
  'dwarf-runepriest':
    'un viejo sacerdote enano con barba blanca trenzada, tablillas de piedra talladas con runas y un martillo brillante',
  'cave-bat': 'un murciélago gigante de caverna con alas de cuero, orejas enormes y colmillitos',
  'stone-basilisk': 'un lagarto pesado de seis patas con escamas gris piedra y ojos brillantes que petrifican',
  // Snow
  yeti: 'un yeti corpulento de pelaje blanco con brazos largos, piel azul en la cara y carámbanos en el pelaje',
  'frost-wolf': 'un lobo blanco con ojos azul escarcha y cristales de hielo formándose en la melena',
  'ice-wisp': 'un fuego fatuo flotante de luz fría azul pálido con una corona de esquirlas de hielo',
  'snow-troll': 'un trol enorme de piel pálida quemada por el frío, taparrabos de piel y un garrote cubierto de hielo',
  'ice-wraith':
    'un espectro fantasmal de niebla helada con cara oscura bajo una capucha, ojos brillantes y garras de hielo',
  'frost-giant':
    'un gigante de piel azul con una larga barba blanca de carámbanos y una pesada armadura de acero congelado',
  'polar-bear': 'un oso polar enorme de pelaje blanco y espeso con escarcha en las garras',
  'snow-harpy': 'una arpía con alas de plumas blancas, piel azul pálido y garras heladas',
  'frozen-shaman':
    'un chamán con gruesas pieles blancas y una máscara tallada de reno en madera, con un báculo de hielo azul',
  // Volcanic
  salamander: 'una salamandra de fuego roja y larga con dibujos naranjas brillantes y llamas a lo largo del lomo',
  'magma-elemental': 'un humanoide de magma fundido con una costra de basalto agrietada y fuego en lugar de ojos',
  'young-dragon':
    'un dragón rojo joven del tamaño de un caballo, alas pequeñas y humo que le sale de las fosas nasales',
  'fire-imp': 'un diablillo rojo pequeño con alas de murciélago, sonrisa traviesa y una bola de fuego en la mano',
  'lava-golem': 'un gólem pesado de roca de obsidiana negra con ríos de lava brillante en sus grietas',
  'ash-wraith': 'un espectro de ceniza gris y brasas flotantes con una cara hueca en llamas',
  hellhound: 'un sabueso negro con ojos rojos ardientes, melena en llamas y fauces humeantes',
  'obsidian-knight':
    'un caballero con armadura de placas de obsidiana negra con juntas naranjas brillantes y un pesado escudo torre',
  'flame-priest': 'un sacerdote fanático con túnica roja, máscara de latón con cuernos y un incensario de brasas',
  // Wastelands
  ghoul: 'un necrófago gris encorvado con garras largas, ojos hundidos y harapos rotos',
  'bone-knight': 'un caballero esqueleto no muerto con armadura de placas oxidada y una espada larga mellada',
  devourer: 'una criatura flaca y sin ojos de piel negra y lisa con una boca enorme y sonriente de dientes puntiagudos',
  banshee: 'un espíritu flotante de mujer pálida con largo cabello blanco, vestido ondulante y boca que se lamenta',
  'plague-rat':
    'una rata regordeta y enfermiza con pelaje ralo, manchas verdes y una nube de gas tóxico verde alrededor',
  'grave-priest': 'un sacerdote nigromante con túnica negra y violeta y un farol con forma de calavera',
  'hollow-archer': 'un arquero esquelético con un yelmo vacío y un arco largo negro',
  'flesh-golem': 'un gólem de retazos altísimo hecho de tela y cuero cosidos, pernos de hierro y cadenas',
  'carrion-crow': 'un cuervo negro gigante de plumas raídas, ojos rojos y pico afilado',
  // Abyss
  'crucible-horror': 'una masa de metal fundido y escoria con varios brazos y bocas rojas brillantes',
  'castle-warden':
    'un carcelero gigante acorazado en hierro negro con yelmo en forma de jaula y una enorme maza con forma de llave',
  'abyss-eye': 'un globo ocular gigante flotante con tentáculos y un iris rojo brillante rodeado de humo oscuro',
  'abyssal-knight': 'un caballero con armadura negra dentada envuelta en llamas violetas, con un mandoble maldito',
  'chaos-spawn': 'un demonio retorcido con extremidades disparejas, cuernos y demasiados ojos',
  'void-weaver': 'una criatura del vacío parecida a una araña, con cuerpo negro estrellado e hilos de luz violeta',
  'crucible-priest':
    'un sacerdote de la forja con túnica rojo fundido, máscara de hierro derretido y un báculo con forma de martillo',
  'shadow-stalker': 'una criatura de sombra alta y delgada con dedos largos como cuchillas y ojos blancos brillantes',
  'molten-horror': 'una bestia corpulenta de lava que se enfría, con un horno abierto en lugar de pecho',
  // Bosses: mini bosses
  'boar-matriarch':
    'una matriarca jabalí espinada colosal con colmillos enormes, una corona de ramas espinosas y cicatrices de batalla',
  'bandit-chief': 'un jefe bandido humano con cicatrices, abrigo con ribete de piel, un sable pesado y una faja roja',
  'wasp-queen':
    'una reina avispa gigante de rayas amarillas y negras, alas translúcidas, una corona de cera y un aguijón enorme',
  'alpha-wolf': 'Colmillo Gris, un enorme lobo alfa gris con el hocico marcado, un ojo ciego y una melena sombría',
  'elder-treant':
    'un ent antiquísimo y altísimo con una larga barba de musgo, una cara en la corteza y ramas como astas',
  'spider-queen': 'una reina araña gigantesca con torso de mujer de quitina violeta y una corona de ojos',
  'mire-witch':
    'una bruja del pantano encorvada de piel verde, con un caldero a la espalda y un báculo de raíces retorcidas',
  'jaguar-king': 'un jaguar dorado gigante con un tocado de plumas y placas de armadura de oro',
  'swamp-hydra': 'una hidra de pantano de tres cabezas con escamas verdes cubiertas de musgo y fauces venenosas',
  'dune-wyrm': 'un wyrm de arena colosal y acorazado con placas de arenisca y una cresta de púas',
  'mummy-pharaoh':
    'un faraón momificado con máscara funeraria dorada, una corona alta y un cetro con un escarabajo brillante',
  'sand-titan': 'un gigante hecho de arena que fluye con una antigua máscara de piedra por cara',
  'crystal-wyrm': 'un dragón serpentino cuyo cuerpo está hecho de esquirlas de cristal cian que brillan desde adentro',
  'dwarf-warlord':
    'un señor de la guerra enano con una enorme armadura de placas forjada con runas, un hacha de doble filo y un estandarte',
  'thunder-roc': 'un ave roc enorme de plumas doradas que chisporrotean con rayos y una tormenta a su alrededor',
  'winter-witch': 'una bruja alta y pálida con una corona de carámbanos, capa de piel blanca y un báculo de hielo azul',
  'ice-troll-king': 'un rey trol enorme de piel azul escarcha, corona de hielo y un garrote de piedra congelada',
  'ancient-mammoth':
    'un mamut ancestral colosal de pelaje blanco escarchado, colmillos curvos enormes cubiertos de hielo y runas talladas',
  'fire-drake': 'un draco de fuego rojo con alas en llamas y escamas fundidas',
  'magma-behemoth': 'un behemot cuadrúpedo gigantesco de basalto y magma que fluye, con púas volcánicas en el lomo',
  lich: 'un liche hechicero esquelético con túnicas reales raídas, corona y un báculo coronado por una gema de alma verde',
  'bone-dragon': 'un dragón esquelético hecho de huesos enormes con fuego fantasmal violeta dentro de la caja torácica',
  'abyssal-champion': 'un campeón demonio altísimo con armadura negra con púas y un mandoble carmesí en llamas',
  'crucible-maw':
    'un monstruo de forja enorme que es casi todo boca llena de dientes fundidos, con cadenas y chimeneas de horno',
  // Bosses: captors and Seals
  morgrath:
    'Morgrath, la Bruja del Musgo: una bruja antigua gigante cubierta de musgo y hongos, corona de astas y ojos verdes brillantes',
  sahrak: 'Sahrak, el Rey Escorpión: un enorme rey centauro escorpión con corona dorada y cola venenosa',
  vorneth:
    'Vorneth, el Wyrm de Escarcha: un dragón de hielo serpentino con escamas azules translúcidas y un aura de aliento helado',
  ignaroth:
    'Ignaroth, Señor de la Ceniza: un señor del fuego altísimo de ceniza y brasas con cuernos ardientes y corona fundida',
  xalqui:
    'Xalqui, la Serpiente de Jade: una serpiente emplumada gigantesca con escamas de jade y ornamentos dorados de templo',
  colossus:
    'El Coloso de Basalto: un gigante humanoide enorme de columnas de basalto negro con runas brillantes en el pecho',
  vael: 'Vael, el Caballero Hueco: un caballero alto con armadura negra vacía, sin cuerpo adentro, y un mandoble fantasmal',
  crisol:
    'Crisol: un dios forja viviente, un horno colosal de metal fundido con corona de yunques, cadenas y un corazón brillante',
  // Bosses: sanctuary guardians
  'old-scarecrow':
    'un espantapájaros antiguo gigante con cabeza de arpillera como calabaza, ojos brillantes y cuervos en los brazos',
  'moss-golem': 'un gólem grande de piedras con musgo y raíces, con un corazón de cristal verde brillante',
  'temple-serpent': 'una serpiente de templo gigante con escamas turquesa y ornamentos ceremoniales dorados',
  sphinx: 'una esfinge con cuerpo de león, alas de águila y una serena cara humana dorada con tocado de faraón',
  'rune-golem': 'un gólem enorme de bloques de granito tallado cubierto de runas de rayo azules brillantes',
  'ember-sentinel': 'una enorme estatua centinela acorazada de bronce y obsidiana con fuego de brasas en el visor',
  phoenix: 'un fénix majestuoso de plumas naranjas y doradas en llamas y una larga cola de fuego',
  'frost-sentinel': 'una estatua acorazada gigante de hielo azul y acero con una alabarda congelada',
  'death-knight':
    'un caballero de la muerte con armadura de placas negra, sin montura, con yelmo de calavera y una espada rúnica que roba almas',
  'wraith-lord': 'un señor espectral altísimo con capucha, corona de hierro negro y cadenas fantasmales',
  'void-sentinel': 'un centinela enorme sin rostro de piedra negra y luz violeta del vacío',
  'crucible-herald':
    'el Heraldo del Crisol: un heraldo alado con armadura rojo fundido y un báculo de forja con forma de trompeta',
  // Reliquary wardens
  'cinder-stag':
    'el Ciervo de Ceniza: un ciervo enorme de corteza negra carbonizada y brasas brillantes, con astas que arden en llamas naranjas',
  'shell-colossus':
    'el Coloso de Caparazón: un gigante altísimo parecido a una tortuga con caparazón de jade cubierto de musgo y percebes, de pie sobre patas gruesas',
  'glass-djinn':
    'el Djinn de Cristal: un djinn flotante de cristal azul transparente con un torbellino de arena y hielo en lugar de piernas',
  'storm-harpy':
    'la Arpía de la Tormenta: una arpía grande de plumas gris pizarra, garras afiladas y alas que chisporrotean con rayos azules',
  'granite-warden':
    'el Celador de Granito: un gólem enorme con forma de caballero de bloques de granito gris, con un escudo torre de piedra y runas ámbar',
  'frost-reaver':
    'el Saqueador Gélido: un saqueador pálido y corpulento con pieles cubiertas de hielo, trenzas congeladas y dos cuchillas de hielo dentadas',
  'ashen-seraph':
    'el Serafín Ceniciento: una figura angelical de seis alas de ceniza y oro con un halo agrietado y una espada en llamas apuntando hacia abajo',
  'thorn-widow':
    'la Viuda de Espinas: una araña negra gigante cuyas patas son zarzas espinosas y cuyo cuerpo es una flor violeta marchita',
  'storm-revenant':
    'el Aparecido de la Tormenta: un caballero acorazado fantasmal hecho de nubes de tormenta, con el yelmo hueco lleno de rayos',
  'prism-horror':
    'el Horror Prismático: una masa flotante de esquirlas de cristal y muchos ojos que divide la luz en rayos de arcoíris ardientes'
}

/** The heroes' own bodies: what stays when they change clothes and weapons. */
export const HERO_BODIES: Record<string, string> = {
  kael: 'Kael, un joven espadachín humano de veintitantos años, delgado y lleno de energía, pelo corto en punta castaño oscuro, grandes ojos ámbar decididos y una sonrisa confiada',
  sera: 'Sera, una joven arquera humana, ágil y delgada, con una larga trenza castaño rojiza y ojos verdes penetrantes',
  brann:
    'Brann, un enorme berserker humano, cabeza rapada con tatuajes tribales, barba roja espesa y grandes brazos musculosos',
  oren: 'Oren, un viejo druida humano con una larga barba gris trenzada con hojas y ojos amables y chispeantes',
  ysolde: 'Ysolde, una joven hechicera de largo cabello plateado y ojos violetas'
}

/** What each hero wears. */
export const HERO_CLOTHES: Record<string, string> = {
  kael: 'armadura de cuero marrón claro con hombreras redondeadas de acero brillante, pantalones marrones, botas de cuero resistentes, una larga bufanda carmesí y un pequeño escudo redondo de madera con borde de acero sujeto al antebrazo derecho',
  sera: 'una capa con capucha verde bosque sobre una armadura ligera de cuero marrón claro, brazales de cuero y botas blandas',
  brann: 'un manto de piel sobre los hombros, una coraza de hierro, brazos desnudos, falda de cuero y botas de piel',
  oren: 'largas túnicas verde musgo y de corteza marrón con enredaderas vivas, y sandalias',
  ysolde: 'una elegante túnica azul profundo con bordados dorados y cuello alto, mangas largas y botas blandas'
}

/** The hand each hero holds the weapon with (the shield, if any, goes on the other arm); right unless listed. */
export const HERO_WEAPON_HAND: Record<string, 'left' | 'right'> = {
  kael: 'left'
}

/** The weapons each hero can hold; the first one is the one they start with. */
export const HERO_WEAPONS: Record<string, Record<string, string>> = {
  kael: {
    sword: 'una espada larga y recta de acero con empuñadura forrada en cuero y una guarda en cruz sencilla',
    dawnbrand:
      'Albaclara, una espada larga levemente curva cuya hoja brilla por dentro en naranja dorado como un amanecer, con finas llamas que recorren el filo y una guarda con forma de sol',
    mace: 'Bastión de Ormund, una pesada maza de acero con aletas, empuñadura larga forrada en cuero azul y un pomo pequeño con forma de escudo redondo'
  },
  sera: {
    bow: 'un arco recurvo alto de madera clara con la cuerda tensa',
    crossbow:
      'Colmillo Invernal, una ballesta compacta de madera oscura y acero escarchado, con puntas como carámbanos en los brazos y un virote azul pálido cargado',
    'gale-bow':
      'Canto del Vendaval, un arco esbelto de madera blanco plateada tallado con espirales de viento, con plumitas en las puntas y chispas tenues de rayo a lo largo de la cuerda'
  },
  brann: {
    axe: 'un hacha de guerra enorme de doble filo con un mango largo reforzado con bandas de hierro',
    maul: 'Corazón de Cantera, un mazo enorme a dos manos cuya cabeza es un bloque tosco de granito atado con bandas de hierro, con grietas que brillan en ámbar tenue',
    hatchets:
      'una de las Hermanas Rojas: una hachuela corta de un solo filo con mango laqueado en rojo y una hoja de acero carmesí mellada'
  },
  oren: {
    'root-sickle':
      'Raíz Antigua, una hoz de una mano cuya empuñadura es una raíz viva y retorcida y cuya hoja curva de madera tiene un filo de corteza que brilla en verde, con raicitas que cuelgan del pomo',
    scythe:
      'Mediodía, una guadaña alta de madera blanca y oro cuya larga hoja curva brilla con cálida luz de sol, con un disco solar radiante donde la hoja se une al mango',
    'thorn-sickle':
      'Última Cosecha, una hoz de mango largo de madera negra cuya hoja curva es una única espina enorme que gotea veneno verde'
  },
  ysolde: {
    tome: 'Trinidad, un grimorio grueso y abierto que flota junto a su mano, encuadernado en cuero azul profundo con tres sellos brillantes de fuego, hielo y rayo en la tapa',
    codex:
      'Voz del Trueno, un códice de tormenta abierto que flota junto a su mano, con refuerzos de hierro y broches de plata, y páginas que se agitan y chisporrotean con rayos blanco azulados',
    grimoire:
      'Prisma del Ocaso, un libro abierto de páginas de cristal oscuro que flota junto a su mano, con un prisma engarzado en la tapa que divide la luz en rayos de arcoíris'
  }
}

/** The heroes as they start: body, clothes and first weapon. */
export const HERO_LOOKS: Record<string, string> = Object.fromEntries(
  Object.entries(HERO_BODIES).map(([id, body]) => [
    id,
    [body, `que lleva ${HERO_CLOTHES[id]}`, `sosteniendo ${Object.values(HERO_WEAPONS[id])[0]}`].join(', ')
  ])
)
