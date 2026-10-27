/**
 * What each creature looks like, for its prompt (see catalog.ts). English,
 * because that is what the image tools follow best.
 */
export const ENEMY_LOOKS: Record<string, string> = {
  // Meadows
  'thorn-boar': 'a large wild boar with brown bristly fur, long curved tusks and rows of wooden thorns along its spine',
  'road-bandit':
    'a wiry human highwayman in a patched hood and leather jerkin, twin rusty daggers, a scarf over his mouth',
  'wheat-spirit': 'a floating spirit woven from golden wheat stalks, a hollow face of straw and glowing amber eyes',
  'hedge-sprite': 'a tiny winged fairy made of leaves and hedge twigs, holding a thorny wand that glows green',
  'field-rat': 'an oversized field rat with mangy grey fur, yellow incisors and a long scaly tail',
  scarecrow: 'a living scarecrow of sackcloth and straw on a wooden pole, a stitched grin and a rusty sickle',
  'meadow-wasp': 'a dog-sized wasp with yellow and black stripes, translucent wings and a dripping stinger',
  'bandit-archer': 'a lean human bandit archer in a green hood and leather bracers, drawing a short bow',
  'giant-toad': 'a huge warty brown toad with a wide mouth, bulging eyes and poison glands on its back',
  // Forests
  'shadow-wolf': 'a black wolf made half of smoke, glowing violet eyes and wisps of shadow trailing from its fur',
  'rotten-ent': 'a hunched walking tree of rotten wood covered in fungus and moss, hollow glowing eyes',
  'weaver-spider': 'a giant purple forest spider with hairy legs, eight shining eyes and silk dripping from its jaws',
  'thorn-dryad': 'a slender dryad woman with bark skin, thorny vines for hair and a staff of living wood',
  'bog-wight': 'a gaunt drowned corpse covered in swamp weed, a lantern of green witch-fire in its bony hand',
  'moss-bear': 'a massive brown bear with moss and small ferns growing on its back and shoulders',
  'forest-goblin': 'a small green goblin in a leaf cloak with a crude spear and a mischievous grin',
  'cursed-stag': 'a gaunt black stag with huge antlers dripping dark ichor and blood-red eyes',
  'creeping-vine': 'a writhing mass of thick thorny vines rising from the ground with a toothy flower at its top',
  // Tropical
  'jade-viper': 'a long emerald-green viper with jade scales, a hooded head and dripping fangs',
  'fungal-shaman': 'a squat mushroom-man with a wide spotted magenta cap, bone beads and a glowing spore staff',
  'toxic-frog': 'a bright poison dart frog the size of a dog, neon blue and yellow skin oozing venom',
  'jungle-panther': 'a sleek black panther with faint jade rosettes on its fur and glowing yellow eyes',
  'giant-mosquito': 'a giant mosquito with a long needle proboscis, red swollen abdomen and buzzing wings',
  'carnivorous-plant': 'a huge carnivorous plant with a gaping toothy pod for a head and grasping vine tendrils',
  'lizard-warrior': 'a muscular lizardfolk warrior with green scales, a bone spear and a feathered war shield',
  'mangrove-croc': 'a huge swamp crocodile with mossy armored scales and rows of jagged teeth',
  'tribal-witch': 'an old jungle witch in feathers and bone masks, a skull-topped staff and glowing tattoos',
  // Deserts
  'giant-scorpion': 'a giant desert scorpion with a sand-colored carapace, huge pincers and a curved venom tail',
  'wandering-mummy': 'a shambling mummy in rotting bandages, glowing blue eyes and gold amulets',
  'sand-worm': 'a colossal sand worm bursting from the dunes with a round mouth of spiral teeth',
  'dune-raider': 'a desert raider in flowing sand-colored robes and a face veil, with a curved scimitar',
  'sun-priest': 'a robed desert priest with a golden sun mask and a staff crowned with a glowing sun disk',
  'desert-djinn': 'a blue-skinned djinn whose lower body is a swirling sandstorm, golden bracers and burning eyes',
  vulture: 'a huge bald vulture with ragged dark feathers, a hooked beak and a bare red neck',
  'tomb-guardian': 'a tall jackal-headed stone statue warrior with a golden halberd, cracks glowing with blue light',
  'scarab-swarm': 'a swarm of hundreds of black-and-gold scarab beetles forming a vaguely humanoid shape',
  // Mountains
  'rock-golem': 'a heavy golem of grey boulders held together by glowing runes, with huge stone fists',
  harpy: 'a harpy with a pale woman face, brown feathered wings for arms and sharp taloned feet',
  'renegade-dwarf': 'a stocky dwarf warrior with a braided red beard, dented iron armor and a war hammer',
  'mountain-troll': 'a towering grey mountain troll with rocky skin, a broken tree trunk as a club',
  'storm-eagle': 'a giant eagle with storm-grey feathers crackling with blue lightning',
  'crystal-sprite': 'a small floating sprite made of cyan crystal shards that refract light',
  'dwarf-runepriest': 'an old dwarf priest with a white braided beard, rune-carved stone tablets and a glowing hammer',
  'cave-bat': 'a giant cave bat with leathery wings, huge ears and needle fangs',
  'stone-basilisk': 'a heavy six-legged lizard with stone-grey scales and petrifying glowing eyes',
  // Snow
  yeti: 'a hulking white-furred yeti with long arms, blue skin on its face and icicles in its fur',
  'frost-wolf': 'a white wolf with frost-blue eyes and ice crystals forming on its mane',
  'ice-wisp': 'a floating wisp of pale blue cold light with a crown of ice shards',
  'snow-troll': 'a huge troll with frost-bitten pale skin, a fur loincloth and an ice-crusted club',
  'ice-wraith': 'a ghostly wraith of freezing mist with a hooded skull face and icy claws',
  'frost-giant': 'a giant with blue skin, a long white beard of icicles and heavy armor of frozen steel',
  'polar-bear': 'a massive polar bear with scarred white fur and frost on its claws',
  'snow-harpy': 'a harpy with white feathered wings, pale blue skin and icy talons',
  'frozen-shaman': 'a shaman in thick white furs and a reindeer skull mask, holding a staff of blue ice',
  // Volcanic
  salamander: 'a long red fire salamander with glowing orange patterns and flames along its back',
  'magma-elemental': 'a humanoid of molten magma with a cracked basalt crust and fire for eyes',
  'young-dragon': 'a young red dragon the size of a horse, small wings, smoke rising from its nostrils',
  'fire-imp': 'a small red imp with bat wings, a mischievous grin and a fireball in its hand',
  'lava-golem': 'a heavy golem of black obsidian rock with rivers of glowing lava in its cracks',
  'ash-wraith': 'a wraith of grey ash and drifting embers with a burning hollow face',
  hellhound: 'a black hound with burning red eyes, a flaming mane and smoking jaws',
  'obsidian-knight': 'a knight in black obsidian plate armor with glowing orange seams and a heavy tower shield',
  'flame-priest': 'a fanatic priest in red robes with a horned brass mask and a censer of burning coals',
  // Wastelands
  ghoul: 'a hunched grey ghoul with long claws, sunken eyes and torn rags',
  'bone-knight': 'an undead skeleton knight in rusted plate armor with a notched longsword',
  devourer: 'a lean eyeless creature of stretched black skin with an enormous mouth of needle teeth',
  banshee: 'a floating pale woman spirit with long white hair, a torn gown and a screaming mouth',
  'plague-rat': 'a bloated diseased rat with patchy fur, boils and green toxic drool',
  'grave-priest': 'a necromancer priest in black and purple robes with a skull lantern',
  'hollow-archer': 'a skeletal archer with an empty helmet and a black longbow',
  'flesh-golem': 'a towering patchwork golem of stitched flesh, iron bolts and chains',
  'carrion-crow': 'a giant black crow with tattered feathers, red eyes and a bloody beak',
  // Abyss
  'crucible-horror': 'a mass of molten metal and fused bodies with several arms and glowing red mouths',
  'castle-warden': 'a giant armored jailer in black iron with a cage-shaped helmet and a huge key mace',
  'abyss-eye': 'a floating giant eyeball with tentacles and a red glowing iris surrounded by dark smoke',
  'abyssal-knight': 'a knight in jagged black armor wreathed in purple flames, with a cursed greatsword',
  'chaos-spawn': 'a twisted demon with mismatched limbs, horns and too many eyes',
  'void-weaver': 'a spider-like void creature with a starry black body and threads of violet light',
  'crucible-priest': 'a priest of the forge in molten-red robes, a mask of melted iron and a hammer-shaped staff',
  'shadow-stalker': 'a tall thin shadow creature with long blade fingers and white glowing eyes',
  'molten-horror': 'a hulking beast of cooling lava with a gaping furnace for a chest',
  // Bosses: mini bosses
  'boar-matriarch': 'a colossal thorn boar matriarch with massive tusks, a crown of thorny branches and battle scars',
  'bandit-chief': 'a scarred human bandit chief in a fur-trimmed coat with a heavy saber and a red sash',
  'alpha-wolf': 'Grey Fang, a huge grey alpha wolf with a scarred muzzle, one blind eye and a shadowy mane',
  'elder-treant': 'an ancient towering treant with a long beard of moss, a face in its bark and branches like antlers',
  'spider-queen': 'a gigantic spider queen with a woman-shaped upper body of purple chitin and a crown of eyes',
  'mire-witch': 'a hunched swamp witch with green skin, a cauldron on her back and a staff of twisted roots',
  'jaguar-king': 'a giant golden jaguar with a feathered headdress and gold armor plates',
  'swamp-hydra': 'a three-headed swamp hydra with mossy green scales and dripping venomous jaws',
  'dune-wyrm': 'a colossal armored sand wyrm with sandstone plates and a crest of spikes',
  'mummy-pharaoh': 'a mummified pharaoh with a golden death mask, a tall crown and a sceptre with a glowing scarab',
  'sand-titan': 'a giant made of flowing sand with an ancient stone mask for a face',
  'crystal-wyrm': 'a serpentine dragon whose body is made of cyan crystal shards that glow from within',
  'dwarf-warlord': 'a dwarf warlord in massive rune-forged plate armor with a double-headed war axe and a banner',
  'thunder-roc': 'an enormous roc bird with golden feathers crackling with lightning and a storm around it',
  'winter-witch': 'a tall pale witch with a crown of icicles, a white fur cloak and a staff of blue ice',
  'ice-troll-king': 'a huge troll king with frost-blue skin, an ice crown and a club of frozen stone',
  'fire-drake': 'a winged red fire drake with flaming wings and molten scales',
  'magma-behemoth': 'a gigantic quadruped behemoth of basalt and flowing magma with volcanic spikes on its back',
  lich: 'a skeletal lich sorcerer in rotting royal robes with a crown and a staff topped with a green soul gem',
  'bone-dragon': 'a skeletal dragon made of huge bones with purple ghost fire inside its ribcage',
  'abyssal-champion': 'a towering demon champion in spiked black armor with a burning crimson greatsword',
  'crucible-maw': 'a huge forge monster that is mostly a mouth full of molten teeth, with chains and furnace vents',
  // Bosses: captors and Seals
  morgrath:
    'Morgrath, the Moss Witch: a giant ancient witch covered in moss and mushrooms, antler crown, glowing green eyes',
  sahrak: 'Sahrak, the Scorpion King: a huge scorpion centaur king with a golden crown and a venomous tail',
  vorneth: 'Vorneth, the Frost Wyrm: a serpentine ice dragon with translucent blue scales and a frozen breath aura',
  ignaroth: 'Ignaroth, Lord of Ash: a towering fire lord of ash and embers with burning horns and a molten crown',
  xalqui: 'Xalqui, the Jade Serpent: a gigantic feathered serpent with jade scales and golden temple ornaments',
  colossus: 'The Basalt Colossus: an enormous humanoid giant of black basalt columns with glowing runes in its chest',
  vael: 'Vael, the Hollow Knight: a tall knight with empty black armor, no body inside, and a ghostly greatsword',
  crisol:
    'Crisol: a living forge god, a colossal furnace of molten metal with a crown of anvils, chains and a glowing heart',
  // Bosses: sanctuary guardians
  'old-scarecrow': 'a giant ancient scarecrow with a pumpkin-like burlap head, glowing eyes and crows on its arms',
  'moss-golem': 'a large golem of mossy stones and roots with a glowing green crystal heart',
  'temple-serpent': 'a giant temple serpent with turquoise scales and golden ceremonial ornaments',
  sphinx: 'a sphinx with a lion body, eagle wings and a calm golden human face wearing a pharaoh headdress',
  'rune-golem': 'a massive golem of carved granite blocks covered in glowing blue lightning runes',
  'ember-sentinel': 'a huge armored sentinel statue of bronze and obsidian with ember fire in its visor',
  phoenix: 'a majestic phoenix with flaming orange and gold feathers and a long fiery tail',
  'frost-sentinel': 'a giant armored statue of blue ice and steel with a frozen halberd',
  'death-knight': 'a death knight in black plate armor riding nothing, with a skull helm and a soul-draining runeblade',
  'wraith-lord': 'a towering hooded wraith lord with a crown of black iron and ghostly chains',
  'void-sentinel': 'a massive faceless sentinel of black stone and violet void light',
  'crucible-herald': 'the Herald of Crisol: a winged herald in molten-red armor with a trumpet-shaped forge staff',
  // Reliquary wardens
  'cinder-stag':
    'the Cinder Stag: a huge stag of charred black bark and glowing embers, its antlers burning with orange flames',
  'shell-colossus':
    'the Shell Colossus: a towering turtle-like giant with a mossy jade shell covered in barnacles, standing upright on thick legs',
  'glass-djinn':
    'the Glass Djinn: a floating djinn made of clear blue glass with a whirlwind of sand and ice instead of legs',
  'storm-harpy':
    'the Storm Harpy: a large harpy with slate-gray feathers, sharp talons and wings crackling with blue lightning',
  'granite-warden':
    'the Granite Warden: a massive knight-shaped golem of gray granite blocks holding a stone tower shield, with amber runes',
  'frost-reaver':
    'the Frost Reaver: a hulking pale raider in ice-crusted furs with frozen braids and two jagged ice cleavers',
  'ashen-seraph':
    'the Ashen Seraph: a six-winged angelic figure of ash and gold with a cracked halo and a flaming sword held downwards',
  'thorn-widow':
    'the Thorn Widow: a giant black spider whose legs are thorny brambles and whose body is a withered violet flower',
  'storm-revenant':
    'the Storm Revenant: a ghostly armored knight made of storm clouds, its hollow helm full of lightning',
  'prism-horror':
    'the Prism Horror: a floating mass of crystal shards and many eyes that splits light into burning rainbow beams'
}

/** The heroes' own bodies: what stays when they change clothes and weapons. */
export const HERO_BODIES: Record<string, string> = {
  kael: 'Kael, a young human swordsman in his twenties, lean and athletic, short messy dark-brown hair, determined amber eyes, a faint scar on the cheek',
  sera: 'Sera, a young human archer woman, agile and slim, long auburn braid, sharp green eyes',
  brann: 'Brann, a huge human berserker, bald head with tribal tattoos, thick red beard, scarred muscular arms',
  oren: 'Oren, an old human druid with a long grey beard braided with leaves, kind tired eyes',
  ysolde: 'Ysolde, a young sorceress woman, long silver hair, violet eyes'
}

/** What each hero wears; the first one is the outfit they start with. */
export const HERO_OUTFITS: Record<string, Record<string, string>> = {
  kael: {
    traveller:
      'worn brown leather armor with dented steel pauldrons, brown trousers, leather boots, a tattered crimson scarf and a small round wooden shield with a steel rim strapped to the left forearm'
  },
  sera: { ranger: 'a hooded forest-green cloak over light brown leather armor, leather bracers and soft boots' },
  brann: { berserker: 'a fur mantle over the shoulders, an iron chest plate, bare arms, leather kilt and fur boots' },
  oren: { grove: 'long robes of moss-green and brown bark with living vines, sandals' },
  ysolde: { court: 'an elegant deep-blue robe with gold embroidery and a high collar, long sleeves, soft boots' }
}

/** The weapons each hero can hold; the first one is the one they start with. */
export const HERO_WEAPONS: Record<string, Record<string, string>> = {
  kael: {
    sword: 'a long straight steel sword with a leather-wrapped grip and a simple cross guard',
    dawnbrand:
      'Dawnclear, a slightly curved longsword whose blade glows orange-gold from within like a sunrise, with thin flames licking along its edge and a sun-shaped guard',
    mace: "Ormund's Bastion, a heavy flanged steel mace with a long grip wrapped in blue leather and a small round shield-shaped pommel"
  },
  sera: {
    bow: 'a tall recurve bow of pale wood with a taut string',
    crossbow:
      'Winter Fang, a compact crossbow of dark wood and frosted steel, with icicle-like prongs on its limbs and a pale blue bolt loaded',
    'gale-bow':
      'Gale Song, a slender bow of silver-white wood carved with wind spirals, with small feathers on its tips and faint sparks of lightning along the string'
  },
  brann: {
    axe: 'a massive double-bladed battle axe with a long iron-banded haft',
    maul: 'Quarry Heart, a huge two-handed maul whose head is a rough block of granite bound with iron bands, cracks glowing faint amber',
    hatchets:
      'one of the Red Sisters: a short single-bladed hatchet with a red-lacquered haft and a notched, blood-red steel blade'
  },
  oren: {
    staff: 'a gnarled wooden staff topped with a glowing seed',
    scepter:
      'Noon, a short scepter of white wood and gold topped with a radiant sun disc that sheds warm light, with small leaves around the disc',
    sickle:
      'Last Harvest, a long-handled sickle of black wood whose curved blade is made of a single huge thorn dripping green venom'
  },
  ysolde: {
    staff: 'a tall crystal staff with fire, ice and lightning swirling in its crystal',
    'storm-scepter':
      'Thunder Voice, a silver scepter crowned with a caged storm cloud, blue-white lightning crackling between its prongs',
    wand: 'Dusk Prism, a slim wand of dark glass ending in a floating prism that splits the light into rainbow rays'
  }
}

/** The heroes as they start: body, first outfit and first weapon. */
export const HERO_LOOKS: Record<string, string> = Object.fromEntries(
  Object.entries(HERO_BODIES).map(([id, body]) => [
    id,
    [body, `wearing ${Object.values(HERO_OUTFITS[id])[0]}`, `holding ${Object.values(HERO_WEAPONS[id])[0]}`].join(', ')
  ])
)
