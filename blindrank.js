const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"%3E%3Crect width="400" height="260" fill="%231a1a1a"/%3E%3Ctext x="200" y="120" text-anchor="middle" font-family="serif" font-size="32" fill="%23d4af37" opacity="0.5"%3E%26%23x1F9F4%3B%3C/text%3E%3Ctext x="200" y="158" text-anchor="middle" font-family="sans-serif" font-size="13" fill="%23888"%3EFragrance Image%3C/text%3E%3C/svg%3E';

let imageLookupMap = null;
let imageLookupReady = false;

function normalizeForLookup(str) {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\u2019|\u2018|\u2018|'/g, '')
    .replace(/['"]/g, '')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ');
}

function makeLookupKey(brand, name) {
  return normalizeForLookup(brand) + '::' + normalizeForLookup(name);
}

async function buildImageLookup() {
  if (imageLookupReady) return;
  try {
    const CACHE_KEY = 'fragrance_card_images_data';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    let data = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.t < CACHE_TTL) data = parsed.data;
      }
    } catch (_) {}

    if (!data) {
      const res = await fetch('fragrances_merged.json');
      data = await res.json();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
      } catch (_) {}
    }

    imageLookupMap = new Map();
    for (const f of data) {
      if (!f.image) continue;
      const key = makeLookupKey(f.brand, f.name);
      if (!imageLookupMap.has(key)) imageLookupMap.set(key, f.image);
      const nameKey = '::' + normalizeForLookup(f.name);
      if (!imageLookupMap.has(nameKey)) imageLookupMap.set(nameKey, f.image);
    }
    imageLookupReady = true;
  } catch (err) {
    console.warn('blindrank: could not load fragrance image data', err);
    imageLookupMap = new Map();
    imageLookupReady = true;
  }
}

function resolveImage(brand, name) {
  if (!imageLookupReady) return FALLBACK_IMAGE;
  const key = makeLookupKey(brand, name);
  return imageLookupMap.get(key)
    || imageLookupMap.get('::' + normalizeForLookup(name))
    || FALLBACK_IMAGE;
}

function applyImageToEl(el, brand, name) {
  el.src = resolveImage(brand, name);
  el.onerror = () => {
    el.src = FALLBACK_IMAGE;
    el.style.opacity = '0.45';
    el.onerror = null;
  };
}

const FRAGRANCE_POOLS = {
  mens: [
    {
      brand: 'Dior',
      name: 'Sauvage',
      year: 2015,
      description: 'A thunderous, wild wave from the Calabrian bergamot and Ambroxan. Fresh, spicy, and utterly commanding.',
      notes: ['Bergamot', 'Pepper', 'Lavender', 'Patchouli', 'Ambroxan'],
      gender: 'mens'
    },
    {
      brand: 'Chanel',
      name: 'Bleu de Chanel',
      year: 2010,
      description: 'A sophisticated woody aromatic with fresh citrus. The modern masculine icon.',
      notes: ['Citrus', 'Ginger', 'Jasmine', 'Labdanum', 'Sandalwood'],
      gender: 'mens'
    },
    {
      brand: 'Jean Paul Gaultier',
      name: 'Le Male Le Parfum',
      year: 2021,
      description: 'The intensified evolution of a legend. Lavender and vanilla in rich, sensual harmony.',
      notes: ['Lavender', 'Vanilla', 'Mint', 'Bergamot', 'Tonka Bean'],
      gender: 'mens'
    },
    {
      brand: 'Jean Paul Gaultier',
      name: 'Ultra Male',
      year: 2015,
      description: 'A hyper-sweet, ultra-seductive lavender and vanilla bomb. Daring and irresistible.',
      notes: ['Lavender', 'Pear', 'Mint', 'Vanilla', 'Iris'],
      gender: 'mens'
    },
    {
      brand: 'Yves Saint Laurent',
      name: 'Y Eau de Parfum',
      year: 2018,
      description: 'Fresh sage and apple with a rich woody base. A modern powerhouse for confident men.',
      notes: ['Apple', 'Sage', 'Bergamot', 'Ginger', 'Amberwood'],
      gender: 'mens'
    },
    {
      brand: 'Giorgio Armani',
      name: 'Acqua di Gio Profumo',
      year: 2015,
      description: 'An aquatic incense masterpiece. Marine freshness wrapped in a smoky, sensual finish.',
      notes: ['Bergamot', 'Sea Notes', 'Sage', 'Incense', 'Patchouli'],
      gender: 'mens'
    },
    {
      brand: 'Creed',
      name: 'Aventus',
      year: 2010,
      description: 'The king of fragrances. Smoky pineapple, birch, and musk — power and elegance in a bottle.',
      notes: ['Pineapple', 'Blackcurrant', 'Birch', 'Musk', 'Oakmoss'],
      gender: 'mens'
    },
    {
      brand: 'Tom Ford',
      name: 'Oud Wood',
      year: 2007,
      description: 'Rare oud and sandalwood with a vetiver base. Effortlessly luxurious and mysterious.',
      notes: ['Oud', 'Sandalwood', 'Rosewood', 'Vetiver', 'Tonka Bean'],
      gender: 'unisex'
    },
    {
      brand: 'Azzaro',
      name: 'The Most Wanted Parfum',
      year: 2021,
      description: 'Bold lavender, licorice, and hot woods. Seductive and unapologetically masculine.',
      notes: ['Lavender', 'Cardamom', 'Licorice', 'Amberwood', 'Vetiver'],
      gender: 'mens'
    },
    {
      brand: 'Viktor & Rolf',
      name: 'Spicebomb Extreme',
      year: 2015,
      description: 'An explosive spice and tobacco fusion with a rich vanilla core. Maximum impact.',
      notes: ['Pink Pepper', 'Tobacco', 'Vanilla', 'Vetiver', 'Lava Stone'],
      gender: 'mens'
    },
    {
      brand: 'Parfums de Marly',
      name: 'Layton',
      year: 2016,
      description: 'Apple, bergamot, and jasmine over sandalwood and vanilla. Elegant and crowd-pleasing.',
      notes: ['Apple', 'Bergamot', 'Pepper', 'Jasmine', 'Sandalwood', 'Vanilla'],
      gender: 'mens'
    },
    {
      brand: 'Xerjoff',
      name: 'Naxos',
      year: 2009,
      description: 'Lavender, honey, and tobacco over a creamy vanilla base. Sensual and intoxicating.',
      notes: ['Bergamot', 'Lavender', 'Honey', 'Tobacco', 'Vanilla'],
      gender: 'unisex'
    },
    {
      brand: 'Mancera',
      name: 'Cedrat Boise',
      year: 2012,
      description: 'Citrus freshness meets mossy wood and musk. Effortlessly versatile and beloved.',
      notes: ['Bergamot', 'Lemon', 'Blackcurrant', 'Oakmoss', 'Cedar', 'Musk'],
      gender: 'mens'
    },
    {
      brand: 'Giorgio Armani',
      name: 'Stronger With You Intensely',
      year: 2019,
      description: 'Sweet chestnut and vanilla wrapped in warm spice. Cozy and seductively attractive.',
      notes: ['Chestnut', 'Vanilla', 'Cardamom', 'Salvia', 'Tonka Bean'],
      gender: 'mens'
    },
    {
      brand: 'Montale',
      name: 'Arabians Tonka',
      year: 2013,
      description: 'Rich oud and spice interwoven with sweet tonka. A Middle Eastern luxury in a bottle.',
      notes: ['Oud', 'Tonka Bean', 'Sandalwood', 'Musk', 'Amber'],
      gender: 'unisex'
    },
    {
      brand: 'Paco Rabanne',
      name: '1 Million Parfum',
      year: 2021,
      description: 'Blood orange and cinnamon over a tobacco and leather base. Rich and magnetic.',
      notes: ['Blood Orange', 'Cinnamon', 'Rose', 'Tobacco', 'Leather'],
      gender: 'mens'
    },
    {
      brand: 'Versace',
      name: 'Eros',
      year: 2012,
      description: 'Mint, green apple, and vanilla in a fresh, powerful masculine. A modern classic.',
      notes: ['Mint', 'Green Apple', 'Lemon', 'Tonka Bean', 'Vanilla', 'Vetiver'],
      gender: 'mens'
    },
    {
      brand: 'Givenchy',
      name: 'Gentleman Parfum',
      year: 2021,
      description: 'Patchouli and iris with a leathery amber base. Distinguished and effortlessly elegant.',
      notes: ['Iris', 'Patchouli', 'Bergamot', 'Leather', 'Amber'],
      gender: 'mens'
    },
    {
      brand: 'Creed',
      name: 'Silver Mountain Water',
      year: 1995,
      description: 'Green tea, bergamot, and sandalwood inspired by mountain glaciers. Crisp, clean, and effortlessly elegant.',
      notes: ['Green Tea', 'Bergamot', 'Blackcurrant', 'Sandalwood', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Parfums de Marly',
      name: 'Althair',
      year: 2022,
      description: 'Bergamot and grapefruit open into a heart of iris and vetiver. Modern masculine with a royal edge.',
      notes: ['Bergamot', 'Grapefruit', 'Iris', 'Vetiver', 'Musk'],
      gender: 'mens'
    },
    {
      brand: 'Louis Vuitton',
      name: 'Imagination',
      year: 2021,
      description: 'A citrus aquatic built on yuzu, grapefruit, and a woody musk. Fresh, luminous, and quietly luxurious.',
      notes: ['Yuzu', 'Grapefruit', 'Pepper', 'Cedar', 'Musk'],
      gender: 'mens'
    },
    {
      brand: 'Mancera',
      name: 'Red Tobacco',
      year: 2015,
      description: 'Fruity citrus opens into rich tobacco and vanilla. Bold and addictive with incredible longevity.',
      notes: ['Bergamot', 'Cassis', 'Tobacco', 'Vanilla', 'Musk'],
      gender: 'mens'
    },
    {
      brand: 'Jean Paul Gaultier',
      name: 'Le Male In Blue',
      year: 2022,
      description: 'An aquatic take on the iconic Le Male. Fresh sea breeze and lavender over a warm woody base.',
      notes: ['Sea Notes', 'Lavender', 'Bergamot', 'Sandalwood', 'Tonka Bean'],
      gender: 'mens'
    },
    {
      brand: 'Tom Ford',
      name: 'Tobacco Oud',
      year: 2013,
      description: 'Tobacco absolute and smoky oud fused with spice. Dark, intense, and deeply luxurious.',
      notes: ['Tobacco', 'Oud', 'Coriander', 'Leather', 'Amber'],
      gender: 'mens'
    },
    {
      brand: 'Paco Rabanne',
      name: '1 Million',
      year: 2008,
      description: 'Blood orange and cinnamon over a leather and amber base. The original masculine gold standard.',
      notes: ['Blood Orange', 'Cinnamon', 'Grapefruit', 'Leather', 'Amber'],
      gender: 'mens'
    },
    {
      brand: 'Creed',
      name: 'Aventus Absolu',
      year: 2021,
      description: 'A warmer, spicier evolution of Aventus. Pineapple and cinnamon over a rich amber and leather base.',
      notes: ['Pineapple', 'Cinnamon', 'Geranium', 'Amber', 'Leather'],
      gender: 'mens'
    },
    {
      brand: 'Paco Rabanne',
      name: 'Invictus',
      year: 2013,
      description: 'Grapefruit and bay laurel over a clean ambergris and wood base. Fresh, sporty, and triumphant.',
      notes: ['Grapefruit', 'Bay Laurel', 'Jasmine', 'Guaiac Wood', 'Ambergris'],
      gender: 'mens'
    },
    {
      brand: 'Creed',
      name: 'Royal Oud',
      year: 2011,
      description: 'Bergamot and pink pepper with a cedar and oud base. Regal, refined, and supremely elegant.',
      notes: ['Bergamot', 'Pink Pepper', 'Cedar', 'Oud', 'Vetiver'],
      gender: 'mens'
    },
    {
      brand: 'Louis Vuitton',
      name: 'Afternoon Swim',
      year: 2019,
      description: 'Coconut water, mandarin, and lotus over a warm musk. Sun-drenched luxury by the water.',
      notes: ['Coconut Water', 'Mandarin', 'Lotus', 'Musk', 'Sandalwood'],
      gender: 'unisex'
    },
    {
      brand: 'Louis Vuitton',
      name: 'Ombre Nomade',
      year: 2019,
      description: 'A rare, smoky oud with incense and birch. Opulent, mysterious, and deeply transportive.',
      notes: ['Oud', 'Incense', 'Birch', 'Rose', 'Amber'],
      gender: 'unisex'
    },
    {
      brand: 'Louis Vuitton',
      name: 'Symphony',
      year: 2021,
      description: 'Vibrant bergamot and grapefruit harmonize with cedarwood and vetiver. Sleek and refined.',
      notes: ['Bergamot', 'Grapefruit', 'Iris', 'Cedarwood', 'Vetiver'],
      gender: 'unisex'
    },
    {
      brand: 'Mancera',
      name: 'Instant Crush',
      year: 2016,
      description: 'Bergamot and lemon over a creamy sandalwood and vanilla base. Addictive and effortlessly charming.',
      notes: ['Bergamot', 'Lemon', 'Sandalwood', 'Vanilla', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Maison Francis Kurkdjian',
      name: 'Baccarat Rouge 540 Extrait',
      year: 2015,
      description: 'The concentrated version of an icon. Deeper jasmine and ambergris with intensified mineral sweetness.',
      notes: ['Jasmine', 'Saffron', 'Ambergris', 'Cedarwood', 'Fir Resin'],
      gender: 'unisex'
    },
    {
      brand: 'Montale',
      name: 'Black Aoud',
      year: 2006,
      description: 'Rose and patchouli wrapped around a smoky, tarry oud. Dark, complex, and unforgettable.',
      notes: ['Oud', 'Rose', 'Patchouli', 'Musk', 'Amber'],
      gender: 'unisex'
    },
    {
      brand: 'Xerjoff',
      name: 'Alexandria II',
      year: 2007,
      description: 'Saffron and rose over a luxurious oud and sandalwood base. A masterpiece of Middle Eastern opulence.',
      notes: ['Saffron', 'Rose', 'Oud', 'Sandalwood', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Lattafa',
      name: 'Khamrah',
      year: 2022,
      description: 'A sweet, boozy vanilla and caramel over spice and oud. Intoxicating depth at an accessible price.',
      notes: ['Rum', 'Caramel', 'Vanilla', 'Oud', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Stéphane Humbert Lucas',
      name: 'God of Fire',
      year: 2019,
      description: 'Smoked woods, incense, and guaiac resin. Powerful, ceremonial, and utterly striking.',
      notes: ['Smoked Wood', 'Incense', 'Guaiac', 'Benzoin', 'Vetiver'],
      gender: 'unisex'
    },
    {
      brand: 'Kayali',
      name: 'Yum Pistachio Gelato 33',
      year: 2022,
      description: 'Pistachio, tonka bean, and salted caramel. A gourmand dream that wears like a dessert.',
      notes: ['Pistachio', 'Tonka Bean', 'Salted Caramel', 'Vanilla', 'Sandalwood'],
      gender: 'unisex'
    },
    {
      brand: 'Initio',
      name: 'Side Effect',
      year: 2018,
      description: 'Rum, vanilla, and cumin over a musk base. Narcotic, skin-close, and deeply seductive.',
      notes: ['Rum', 'Cumin', 'Vanilla', 'Musk', 'Amber'],
      gender: 'unisex'
    },
    {
      brand: 'Clive Christian',
      name: 'Blonde Amber',
      year: 2022,
      description: 'Warm amber, vanilla, and sandalwood with a floral heart. Luxurious, enveloping, and supremely refined.',
      notes: ['Amber', 'Vanilla', 'Sandalwood', 'Jasmine', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Maison Crivelli',
      name: 'Oud Maracuja',
      year: 2020,
      description: 'Passion fruit and bergamot lift a rich oud and patchouli base. Exotic, vibrant, and deeply original.',
      notes: ['Passion Fruit', 'Bergamot', 'Oud', 'Patchouli', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Louis Vuitton',
      name: 'Ambre Levant',
      year: 2019,
      description: 'Cardamom and rose over a warm amber and sandalwood base. Opulent and evocative of the Middle East.',
      notes: ['Cardamom', 'Rose', 'Saffron', 'Amber', 'Sandalwood'],
      gender: 'unisex'
    },
    {
      brand: 'Carolina Herrera',
      name: 'Stallion Leather Sirocco',
      year: 2023,
      description: 'Smoky leather and amber with a dry desert wind character. Bold, rugged, and uncompromising.',
      notes: ['Leather', 'Amber', 'Smoky Wood', 'Vetiver', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Carolina Herrera',
      name: 'Sandal Ruby',
      year: 2023,
      description: 'Red fruits and rose over a creamy sandalwood base. Rich, smooth, and beautifully balanced.',
      notes: ['Red Fruits', 'Rose', 'Sandalwood', 'Vanilla', 'Musk'],
      gender: 'unisex'
    }
  ],
  womens: [
    {
      brand: 'Maison Francis Kurkdjian',
      name: 'Baccarat Rouge 540',
      year: 2015,
      description: 'The iconic ambergris and jasmine accord. Sweet, mineral, and endlessly captivating.',
      notes: ['Jasmine', 'Saffron', 'Cedarwood', 'Ambergris', 'Fir Resin'],
      gender: 'unisex'
    },
    {
      brand: 'Parfums de Marly',
      name: 'Delina',
      year: 2017,
      description: 'A floral revolution — Turkish rose and lychee over a warm musk. Feminine and addictive.',
      notes: ['Turkish Rose', 'Lychee', 'Peony', 'Vanilla', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Yves Saint Laurent',
      name: 'Libre',
      year: 2019,
      description: 'Lavender and orange blossom over a vanilla and musk base. Powerfully feminine.',
      notes: ['Lavender', 'Orange Blossom', 'Jasmine', 'Vanilla', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Yves Saint Laurent',
      name: 'Black Opium',
      year: 2014,
      description: 'Coffee and vanilla over white flowers. The night owl\'s signature scent.',
      notes: ['Coffee', 'White Flowers', 'Vanilla', 'Pear', 'Cedar'],
      gender: 'womens'
    },
    {
      brand: 'Chanel',
      name: 'Coco Mademoiselle',
      year: 2001,
      description: 'Orange and jasmine over patchouli and vetiver. A timeless feminine icon.',
      notes: ['Orange', 'Jasmine', 'Rose', 'Patchouli', 'Vetiver'],
      gender: 'womens'
    },
    {
      brand: 'Carolina Herrera',
      name: 'Good Girl',
      year: 2016,
      description: 'Jasmine and tuberose over a warm cocoa and tonka base. Duality of good and bad.',
      notes: ['Jasmine', 'Tuberose', 'Cocoa', 'Tonka Bean', 'Coffee'],
      gender: 'womens'
    },
    {
      brand: 'Viktor & Rolf',
      name: 'Flowerbomb',
      year: 2005,
      description: 'An explosion of flowers — jasmine, rose, and freesia over patchouli. Feminine and bold.',
      notes: ['Jasmine', 'Rose', 'Freesia', 'Orchid', 'Patchouli'],
      gender: 'womens'
    },
    {
      brand: 'Lancome',
      name: 'La Vie Est Belle',
      year: 2012,
      description: 'Iris and praline over patchouli and musk. Sweet, joyful, and universally loved.',
      notes: ['Iris', 'Praline', 'Patchouli', 'Jasmine', 'Vanilla'],
      gender: 'womens'
    },
    {
      brand: 'Valentino',
      name: 'Donna Born In Roma',
      year: 2019,
      description: 'Blackcurrant and jasmine over a warm vanilla and bourbon. Romantic and modern.',
      notes: ['Blackcurrant', 'Jasmine', 'Bourbon Vanilla', 'Vetiver', 'Charcoal'],
      gender: 'womens'
    },
    {
      brand: 'Dior',
      name: 'Hypnotic Poison',
      year: 1998,
      description: 'Bitter almond and jasmine over a warm musk. Mysterious, seductive, and unforgettable.',
      notes: ['Bitter Almond', 'Jasmine', 'Caraway', 'Vanilla', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Kilian Paris',
      name: 'Love Don\'t Be Shy',
      year: 2007,
      description: 'Neroli and honeysuckle soaked in marshmallow sweetness. Pure sugary seduction.',
      notes: ['Neroli', 'Honeysuckle', 'Rose', 'Caramel', 'Musk'],
      gender: 'unisex'
    },
    {
      brand: 'Tom Ford',
      name: 'Lost Cherry',
      year: 2018,
      description: 'Black cherry, almond, and tonka over woody musk. Decadent and intoxicating.',
      notes: ['Black Cherry', 'Almond', 'Tonka Bean', 'Turkish Rose', 'Vetiver'],
      gender: 'unisex'
    },
    {
      brand: 'Commodity',
      name: 'Milk',
      year: 2014,
      description: 'Warm milk, sandalwood, and musk. A comforting skin scent like a cozy cashmere blanket.',
      notes: ['Milk', 'Sandalwood', 'Musk', 'Tonka Bean', 'Vanilla'],
      gender: 'unisex'
    },
    {
      brand: 'Chanel',
      name: 'Chance Eau Tendre',
      year: 2010,
      description: 'Grapefruit and quince over jasmine and musk. Fresh, tender, and eternally feminine.',
      notes: ['Grapefruit', 'Quince', 'Jasmine', 'White Musk', 'Cedar'],
      gender: 'womens'
    },
    {
      brand: 'Giorgio Armani',
      name: 'Si Intense',
      year: 2021,
      description: 'Cassis, rose, and vanilla over a deep woody musk. Intense and deeply sensual.',
      notes: ['Cassis', 'Rose', 'Jasmine', 'Vanilla', 'Woody Musk'],
      gender: 'womens'
    },
    {
      brand: 'Guerlain',
      name: 'Mon Guerlain',
      year: 2017,
      description: 'Lavender and sandalwood over a soft vanilla. Dreamily romantic and effortlessly elegant.',
      notes: ['Lavender', 'Bergamot', 'Jasmine', 'Sandalwood', 'Vanilla'],
      gender: 'womens'
    },
    {
      brand: 'Narciso Rodriguez',
      name: 'For Her Musc Noir Rose',
      year: 2021,
      description: 'Rose and raspberry over a seductive musk. Skin-close and intensely personal.',
      notes: ['Rose', 'Raspberry', 'Amber', 'Musk', 'Sandalwood'],
      gender: 'womens'
    },
    {
      brand: 'Mugler',
      name: 'Alien Goddess',
      year: 2021,
      description: 'Bergamot and heliotrope over vanilla and warm musk. Otherworldly and luminous.',
      notes: ['Bergamot', 'Heliotrope', 'Jasmine', 'Vanilla', 'Cashmeran'],
      gender: 'womens'
    },
    {
      brand: 'Prada',
      name: 'Paradoxe',
      year: 2022,
      description: 'Neroli and jasmine over an ambery musk. Fresh yet warm — a modern Prada contradiction.',
      notes: ['Neroli', 'Jasmine', 'Ambrette', 'Amber', 'White Musk'],
      gender: 'womens'
    },
    {
      brand: 'Paco Rabanne',
      name: 'Olympéa Blossom',
      year: 2022,
      description: 'Magnolia and pear blossom over a solar musk. Light, airy, and radiantly feminine.',
      notes: ['Magnolia', 'Pear Blossom', 'White Pepper', 'Solar Musk', 'Sandalwood'],
      gender: 'womens'
    },
    {
      brand: 'Dior',
      name: 'Miss Dior',
      year: 2012,
      description: 'Peony and fresh rose over a soft musk. A timeless love letter to femininity.',
      notes: ['Peony', 'Rose', 'Lily of the Valley', 'Musk', 'Patchouli'],
      gender: 'womens'
    },
    {
      brand: 'Dior',
      name: "J'adore",
      year: 1999,
      description: 'Ylang-ylang and Damascus rose over a warm musk and vanilla base. The ultimate floral femininity.',
      notes: ['Ylang-ylang', 'Damascus Rose', 'Jasmine', 'Vanilla', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Gucci',
      name: 'Bloom Intense',
      year: 2018,
      description: 'An intensified bouquet of tuberose and jasmine over rangoon creeper. Lush, opulent, and feminine.',
      notes: ['Tuberose', 'Jasmine', 'Rangoon Creeper', 'Sandalwood', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Carolina Herrera',
      name: 'Good Girl Midnight',
      year: 2019,
      description: 'Dark cocoa and incense beneath jasmine and tuberose. The seductive darker side of Good Girl.',
      notes: ['Jasmine', 'Tuberose', 'Cocoa', 'Incense', 'Tonka Bean'],
      gender: 'womens'
    },
    {
      brand: 'Kayali',
      name: 'Yum Boujee Marshmallow 81',
      year: 2022,
      description: 'Fluffy marshmallow, vanilla, and caramel musk. Playful, sweet, and delightfully wearable.',
      notes: ['Marshmallow', 'Vanilla', 'Caramel', 'Heliotrope', 'Musk'],
      gender: 'womens'
    },
    {
      brand: 'Kayali',
      name: 'Elixir 11',
      year: 2019,
      description: 'Rose, oud, and vanilla in a rich, golden accord. Feminine, opulent, and deeply alluring.',
      notes: ['Rose', 'Oud', 'Saffron', 'Vanilla', 'Amber'],
      gender: 'womens'
    },
    {
      brand: 'Giorgio Armani',
      name: 'Because It\'s You',
      year: 2016,
      description: 'Raspberry and pear over a warm amber and sandalwood base. Sweet, intimate, and enveloping.',
      notes: ['Raspberry', 'Pear', 'Jasmine', 'Amber', 'Sandalwood'],
      gender: 'womens'
    },
    {
      brand: 'Dior',
      name: 'Addict Rosy Glow EDP',
      year: 2022,
      description: 'Rosy, fruity freshness over a warm woody vanilla. Luminous and beautifully radiant.',
      notes: ['Rose', 'Mandarin', 'Jasmine', 'Vanilla', 'Sandalwood'],
      gender: 'womens'
    }
  ],
  mixed: []
};

// Collect all unique unisex entries from both pools
const _unisexEntries = [
  ...FRAGRANCE_POOLS.mens.filter(f => f.gender === 'unisex'),
  ...FRAGRANCE_POOLS.womens.filter(f => f.gender === 'unisex'),
];
const _seenUnisex = new Set();
const _dedupedUnisex = _unisexEntries.filter(f => {
  const k = f.brand + '::' + f.name;
  if (_seenUnisex.has(k)) return false;
  _seenUnisex.add(k);
  return true;
});

FRAGRANCE_POOLS.mixed = [
  // Top mens-only picks
  ...FRAGRANCE_POOLS.mens.filter(f => f.gender === 'mens').slice(0, 8),
  // Top womens-only picks
  ...FRAGRANCE_POOLS.womens.filter(f => f.gender === 'womens').slice(0, 8),
  // All deduped unisex entries
  ..._dedupedUnisex,
  // Standalone unisex classics
  {
    brand: 'Le Labo',
    name: 'Santal 33',
    year: 2011,
    description: 'Sandalwood, cedarwood, and cardamom with a leather accord. A cult classic.',
    notes: ['Sandalwood', 'Cedarwood', 'Cardamom', 'Iris', 'Leather'],
    gender: 'unisex'
  },
  {
    brand: 'Initio Parfums Prives',
    name: 'Oud for Greatness',
    year: 2018,
    description: 'Raw oud and patchouli over a saffron and musk base. Commanding and profound.',
    notes: ['Oud', 'Patchouli', 'Saffron', 'Nutmeg', 'Musk'],
    gender: 'unisex'
  },
  {
    brand: 'Le Labo',
    name: 'Another 13',
    year: 2013,
    description: 'Ambroxan and musks with jasmine. An addictive, pheromone-like skin scent.',
    notes: ['Ambroxan', 'Jasmine', 'Moss', 'Musk', 'Ambergris'],
    gender: 'unisex'
  }
];

const gameState = {
  category: null,
  selectedFragrances: [],
  currentIndex: 0,
  rankings: new Array(10).fill(null),
  phase: 'start'
};

const CATEGORY_LABELS = { mens: "Men's", womens: "Women's", mixed: 'Mixed' };

function getPool(category) {
  if (category === 'mens') {
    return FRAGRANCE_POOLS.mens.filter(f => f.gender === 'mens' || f.gender === 'unisex');
  } else if (category === 'womens') {
    return FRAGRANCE_POOLS.womens.filter(f => f.gender === 'womens' || f.gender === 'unisex');
  } else {
    return FRAGRANCE_POOLS.mixed;
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectTen(category) {
  const pool = getPool(category);
  return shuffleArray(pool).slice(0, 10);
}

async function startGame(category) {
  gameState.category = category;
  gameState.selectedFragrances = selectTen(category);
  gameState.currentIndex = 0;
  gameState.rankings = new Array(10).fill(null);
  gameState.phase = 'game';
  await buildImageLookup();
  renderGame();
}

function placeFragrance(rankIndex) {
  if (gameState.rankings[rankIndex] !== null) return;
  const frag = gameState.selectedFragrances[gameState.currentIndex];
  gameState.rankings[rankIndex] = frag;
  gameState.currentIndex++;

  const slot = document.querySelector(`.rank-slot[data-rank="${rankIndex}"]`);
  if (slot) {
    slot.classList.add('placing');
    setTimeout(() => slot.classList.remove('placing'), 600);
  }

  if (gameState.currentIndex >= 10) {
    setTimeout(() => {
      gameState.phase = 'results';
      renderResults();
    }, 400);
  } else {
    renderFragranceCard();
    renderRankSlots();
    updateProgress();
  }
}

function renderGame() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="game-layout">
      <div class="game-header">
        <div class="game-progress-bar-wrap">
          <div class="game-progress-bar" id="progressBar"></div>
        </div>
        <div class="game-meta">
          <span class="game-round" id="gameRound"></span>
          <button class="restart-btn" onclick="resetToStart()">Restart</button>
        </div>
      </div>
      <div class="game-body">
        <div class="frag-card-wrap" id="fragCardWrap"></div>
        <div class="rank-panel">
          <p class="rank-panel-label">Choose a rank</p>
          <div class="rank-slots" id="rankSlots"></div>
        </div>
      </div>
    </div>
  `;
  renderFragranceCard();
  renderRankSlots();
  updateProgress();
}

function renderFragranceCard() {
  const frag = gameState.selectedFragrances[gameState.currentIndex];
  if (!frag) return;
  const wrap = document.getElementById('fragCardWrap');
  if (!wrap) return;

  wrap.style.opacity = '0';
  wrap.style.transform = 'translateY(18px)';
  wrap.style.transition = 'none';

  wrap.innerHTML = `
    <div class="frag-card">
      <div class="frag-image-wrap">
        <img class="frag-image" alt="${frag.brand} ${frag.name}" data-brand="${frag.brand}" data-name="${frag.name}" />
        <div class="frag-image-overlay"></div>
      </div>
      <div class="frag-info">
        <p class="frag-brand">${frag.brand}</p>
        <h2 class="frag-name">${frag.name}</h2>
        ${frag.year ? `<p class="frag-year">${frag.year}</p>` : ''}
        <p class="frag-desc">${frag.description}</p>
        <div class="frag-notes">
          ${frag.notes.map(n => `<span class="frag-note">${n}</span>`).join('')}
        </div>
      </div>
    </div>
  `;

  const img = wrap.querySelector('.frag-image');
  applyImageToEl(img, frag.brand, frag.name);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wrap.style.transition = 'opacity 0.38s ease, transform 0.38s ease';
      wrap.style.opacity = '1';
      wrap.style.transform = 'translateY(0)';
    });
  });
}

function renderRankSlots() {
  const container = document.getElementById('rankSlots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const slot = document.createElement('button');
    slot.className = 'rank-slot';
    slot.dataset.rank = i;
    const filled = gameState.rankings[i];
    if (filled) {
      slot.classList.add('filled');
      slot.disabled = true;
      slot.innerHTML = `
        <span class="slot-rank">#${i + 1}</span>
        <span class="slot-content">
          <span class="slot-brand">${filled.brand}</span>
          <span class="slot-name">${filled.name}</span>
        </span>
      `;
    } else {
      slot.innerHTML = `<span class="slot-rank">#${i + 1}</span><span class="slot-empty">Place here</span>`;
      slot.addEventListener('click', () => placeFragrance(i));
    }
    container.appendChild(slot);
  }
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  const round = document.getElementById('gameRound');
  if (bar) bar.style.width = `${(gameState.currentIndex / 10) * 100}%`;
  if (round) round.textContent = `Round ${gameState.currentIndex + 1} of 10`;
}

function buildShareText(full) {
  const cat = CATEGORY_LABELS[gameState.category] || gameState.category;
  const top3 = gameState.rankings.slice(0, 3).map((f, i) => `${i + 1}. ${f.name}`).join(', ');
  const url = 'https://www.maxparfum.net/blindrank.html';
  if (!full) {
    return `I just completed Blind Rank on MaxParfum (${cat}). My top 3: ${top3}. Can you do better?`;
  }
  const list = gameState.rankings.map((f, i) => `#${i + 1} ${f.brand} ${f.name}`).join('\n');
  return `My MaxParfum Blind Rank (${cat})\n${list}\n\nPlay here: ${url}`;
}

async function shareRanking() {
  const url = 'https://www.maxparfum.net/blindrank.html';
  const cat = CATEGORY_LABELS[gameState.category] || gameState.category;
  const text = buildShareText(false);

  if (navigator.share) {
    try {
      await navigator.share({ title: `My MaxParfum Blind Rank`, text, url });
      return;
    } catch (_) {}
  }
  copyToClipboard(buildShareText(true), 'Ranking copied to clipboard');
}

async function copyResults() {
  copyToClipboard(buildShareText(true), 'Results copied to clipboard');
}

async function copyToClipboard(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg);
  }
}

function showToast(msg) {
  const existing = document.getElementById('br-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'br-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(12px);
    background: #1a1a1a;
    border: 1px solid rgba(212,175,55,0.5);
    color: #d4af37;
    font-family: 'Cinzel', serif;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    padding: 0.75rem 1.6rem;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.28s ease, transform 0.28s ease;
    pointer-events: none;
    white-space: nowrap;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function renderResults() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="results-layout">
      <div class="results-header">
        <p class="results-eyebrow">Your Blind Ranking</p>
        <h2 class="results-title">Final Results</h2>
        <p class="results-sub">You've ranked 10 popular fragrances — here's how they stacked up.</p>
      </div>
      <div class="results-list" id="resultsList"></div>
      <div class="results-actions">
        <button class="action-btn share-btn" id="shareBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share My Ranking
        </button>
        <button class="action-btn copy-btn" id="copyBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Results
        </button>
        <button class="action-btn primary-btn" onclick="startGame('${gameState.category}')">Play Again</button>
        <button class="action-btn secondary-btn" onclick="resetToStart()">Change Category</button>
        <a href="index.html" class="action-btn ghost-btn">Back to Home</a>
      </div>
    </div>
  `;

  document.getElementById('shareBtn').addEventListener('click', shareRanking);
  document.getElementById('copyBtn').addEventListener('click', copyResults);

  const list = document.getElementById('resultsList');
  gameState.rankings.forEach((frag, i) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.style.animationDelay = `${i * 0.07}s`;
    row.innerHTML = `
      <div class="result-rank">
        <span class="result-rank-num">${i === 0 ? '&#9733;' : '#' + (i + 1)}</span>
      </div>
      <img class="result-img" alt="${frag.brand} ${frag.name}" data-brand="${frag.brand}" data-name="${frag.name}" />
      <div class="result-info">
        <span class="result-brand">${frag.brand}</span>
        <span class="result-name">${frag.name}</span>
      </div>
    `;
    const img = row.querySelector('.result-img');
    applyImageToEl(img, frag.brand, frag.name);
    list.appendChild(row);
  });
}

function resetToStart() {
  gameState.phase = 'start';
  renderStart();
}

function renderStart() {
  pendingCategory = null;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="start-layout">
      <div class="start-badge">MaxParfum Game</div>
      <h1 class="start-title">Blind Rank</h1>
      <p class="start-desc">
        Ten popular fragrances. One by one, place each into a rank slot from #1 to #10.<br>
        Once placed — it's locked. No going back. Trust your instincts.
      </p>
      <div class="category-section">
        <p class="category-label">Choose your category</p>
        <div class="category-buttons">
          <button class="category-btn" id="btn-mens" onclick="selectCategory('mens')">
            <span class="cat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><path d="M20 4l-6 6"/><path d="M14 4h6v6"/></svg>
            </span>
            <span class="cat-title">Men's</span>
            <span class="cat-sub">Men's + Unisex</span>
          </button>
          <button class="category-btn" id="btn-womens" onclick="selectCategory('womens')">
            <span class="cat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="6"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="9" y1="20" x2="15" y2="20"/></svg>
            </span>
            <span class="cat-title">Women's</span>
            <span class="cat-sub">Women's + Unisex</span>
          </button>
          <button class="category-btn" id="btn-mixed" onclick="selectCategory('mixed')">
            <span class="cat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>
            </span>
            <span class="cat-title">Mixed</span>
            <span class="cat-sub">All Genders</span>
          </button>
        </div>
      </div>
      <div id="startBtnWrap" style="display:none; margin-top: 2rem;">
        <button class="begin-btn" id="beginBtn" onclick="beginGame()">
          Begin Ranking
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

let pendingCategory = null;

function selectCategory(cat) {
  pendingCategory = cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById(`btn-${cat}`);
  if (btn) btn.classList.add('selected');
  const wrap = document.getElementById('startBtnWrap');
  if (wrap) wrap.style.display = 'block';
}

function beginGame() {
  if (pendingCategory) startGame(pendingCategory);
}

document.addEventListener('DOMContentLoaded', () => {
  renderStart();
  buildImageLookup();
});
