import { EVENTS, INTERVALS } from '../data/events';

/** "89.5" / "1.16" / "300,000" style number for an age in Mya, plus its unit. */
export function ageParts(mya: number): { value: string; unit: string; short: string } {
  if (mya >= 1000) {
    const v = trim(mya / 1000, mya >= 10000 ? 1 : 2);
    return { value: v, unit: 'billion years ago', short: `${v} Bya` };
  }
  if (mya >= 1) {
    const v = trim(mya, mya >= 100 ? 0 : 1);
    return { value: v, unit: 'million years ago', short: `${v} Mya` };
  }
  const years = mya * 1e6;
  const v = years >= 10000 ? Math.round(years / 1000) * 1000 : Math.round(years / 100) * 100;
  return { value: v.toLocaleString('en-US'), unit: 'years ago', short: `${(v / 1000).toLocaleString('en-US')}k ya` };
}

export const fmtAge = (mya: number) => { const p = ageParts(mya); return `${p.value} ${p.unit}`; };
export const fmtShort = (mya: number) => ageParts(mya).short;
/** precise number for expert displays */
export const fmtMya = (mya: number) => (mya >= 100 ? mya.toFixed(1) : mya >= 1 ? mya.toFixed(2) : mya.toFixed(3)) + ' Mya';

function trim(n: number, digits: number) {
  return Number(n.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
}

/** geologic period/era that contains an age */
export function periodAt(mya: number) {
  return INTERVALS.find((i) => i.level === 'period' && mya <= i.start && mya > i.end)
    ?? INTERVALS.find((i) => i.level === 'eon' && mya <= i.start && mya > i.end);
}

/** Events that happened after `mya` (i.e. since the split), sorted oldest first */
export function eventsSince(mya: number, majorOnly = true) {
  return EVENTS.filter((e) => e.age < mya && (!majorOnly || e.major)).sort((a, b) => b.age - a.age);
}

export function nearestEventBefore(mya: number) {
  return EVENTS.filter((e) => e.age >= mya).sort((a, b) => a.age - b.age)[0];
}

export const RANK_LABEL: Record<string, string> = {
  superkingdom: 'domain', domain: 'domain', kingdom: 'kingdom', subkingdom: 'subkingdom', phylum: 'phylum', subphylum: 'subphylum',
  superclass: 'superclass', class: 'class', subclass: 'subclass', infraclass: 'infraclass', superorder: 'superorder',
  order: 'order', suborder: 'suborder', infraorder: 'infraorder', parvorder: 'parvorder', superfamily: 'superfamily',
  family: 'family', subfamily: 'subfamily', tribe: 'tribe', subtribe: 'subtribe', genus: 'genus', subgenus: 'subgenus',
  species: 'species', clade: 'clade', cohort: 'cohort', subcohort: 'subcohort',
};

/** Friendly English names for big named groups (shown alongside the scientific name). */
export const FRIENDLY: Record<string, string> = {
  'cellular organisms': 'All cellular life',
  Eukaryota: 'Complex-celled life (eukaryotes)',
  Bacteria: 'Bacteria',
  Archaea: 'Archaea',
  Opisthokonta: 'Animals + fungi',
  Metazoa: 'Animals',
  Fungi: 'Fungi',
  Viridiplantae: 'Green plants',
  Embryophyta: 'Land plants',
  Tracheophyta: 'Vascular plants',
  Spermatophyta: 'Seed plants',
  Magnoliopsida: 'Flowering plants',
  Mesangiospermae: 'Core flowering plants',
  Liliopsida: 'Monocots',
  Poaceae: 'Grasses',
  eudicotyledons: 'Eudicots',
  Pentapetalae: 'Core eudicots',
  rosids: 'Rosids',
  asterids: 'Asterids',
  Bilateria: 'Bilateral animals',
  Protostomia: 'Protostomes',
  Deuterostomia: 'Deuterostomes',
  Ecdysozoa: 'Molting animals',
  Lophotrochozoa: 'Lophotrochozoans',
  Arthropoda: 'Arthropods',
  Hexapoda: 'Six-legged arthropods',
  Insecta: 'Insects',
  Pancrustacea: 'Crustaceans + insects',
  Chelicerata: 'Spiders, scorpions & kin',
  Arachnida: 'Arachnids',
  Mollusca: 'Mollusks',
  Cephalopoda: 'Cephalopods',
  Chordata: 'Chordates',
  Craniata: 'Animals with skulls',
  Vertebrata: 'Vertebrates',
  Gnathostomata: 'Jawed vertebrates',
  Chondrichthyes: 'Sharks, rays & chimaeras',
  Osteichthyes: 'Bony vertebrates',
  Euteleostomi: 'Bony vertebrates',
  Actinopterygii: 'Ray-finned fishes',
  Teleostei: 'Teleost fishes',
  Sarcopterygii: 'Lobe-finned vertebrates',
  Dipnotetrapodomorpha: 'Lungfish + four-limbed animals',
  Tetrapoda: 'Four-limbed animals',
  Amphibia: 'Amphibians',
  Amniota: 'Amniotes (egg-on-land animals)',
  Sauropsida: 'Reptiles & birds',
  Archelosauria: 'Turtles, crocodiles & birds',
  Archosauria: 'Crocodiles & birds (and dinosaurs)',
  Aves: 'Birds',
  Neognathae: 'Neognath birds',
  Neoaves: 'Most modern birds',
  Passeriformes: 'Songbirds & perching birds',
  Lepidosauria: 'Lizards, snakes & tuatara',
  Squamata: 'Lizards & snakes',
  Serpentes: 'Snakes',
  Testudines: 'Turtles',
  Crocodylia: 'Crocodilians',
  Mammalia: 'Mammals',
  Theria: 'Live-bearing mammals',
  Metatheria: 'Marsupials & kin',
  Marsupialia: 'Marsupials',
  Eutheria: 'Placental mammals & kin',
  Monotremata: 'Egg-laying mammals',
  Boreoeutheria: 'Northern placental mammals',
  Euarchontoglires: 'Primates, rodents & rabbits',
  Glires: 'Rodents & rabbits',
  Rodentia: 'Rodents',
  Lagomorpha: 'Rabbits, hares & pikas',
  Primates: 'Primates',
  Haplorrhini: 'Dry-nosed primates',
  Strepsirrhini: 'Lemurs & lorises',
  Simiiformes: 'Monkeys & apes',
  Catarrhini: 'Old World monkeys & apes',
  Hominoidea: 'Apes',
  Hominidae: 'Great apes',
  Homininae: 'African great apes',
  Laurasiatheria: 'Laurasiatherians',
  Carnivora: 'Carnivorans',
  Feliformia: 'Cat-like carnivorans',
  Caniformia: 'Dog-like carnivorans',
  Felidae: 'Cats',
  Canidae: 'Dogs',
  Ursidae: 'Bears',
  Pinnipedia: 'Seals & sea lions',
  Chiroptera: 'Bats',
  Perissodactyla: 'Odd-toed hoofed mammals',
  Artiodactyla: 'Even-toed hoofed mammals & whales',
  Cetacea: 'Whales & dolphins',
  Ruminantia: 'Ruminants',
  Afrotheria: 'Afrotherians (elephants & kin)',
  Xenarthra: 'Sloths, anteaters & armadillos',
  Atlantogenata: 'Afrotherians + xenarthrans',
  Eulipotyphla: 'Hedgehogs, shrews & moles',
  Proboscidea: 'Elephants',
  Dikarya: 'Higher fungi',
  Ascomycota: 'Sac fungi',
  Basidiomycota: 'Mushroom-forming fungi',
  Agaricomycetes: 'Mushrooms',
  Cnidaria: 'Jellyfish, corals & anemones',
  Porifera: 'Sponges',
  Echinodermata: 'Starfish & sea urchins',
  Nematoda: 'Roundworms',
  Annelida: 'Segmented worms',
  Platyhelminthes: 'Flatworms',
  Proteobacteria: 'Proteobacteria',
  Pseudomonadota: 'Proteobacteria',
  Terrabacteria: 'Terrabacteria',
  Cyanobacteria: 'Cyanobacteria',
  Cyanobacteriota: 'Cyanobacteria',
  Firmicutes: 'Firmicutes',
  Bacillota: 'Firmicutes',
  Sar: 'SAR supergroup (diatoms, kelp, ciliates…)',
  Alveolata: 'Alveolates',
  Stramenopiles: 'Stramenopiles',
  Apicomplexa: 'Apicomplexan parasites',
  Amoebozoa: 'Amoebozoans',
  Discoba: 'Discobans',
  Holozoa: 'Animals & close single-celled kin',
  Choanoflagellata: 'Choanoflagellates',
};

export const friendly = (sci: string) => FRIENDLY[sci];

/** a span of time, e.g. "23.5 million years" */
export function fmtDuration(mya: number) {
  return ageParts(mya).unit === 'years ago' ? `${ageParts(mya).value} years` : `${ageParts(mya).value} ${ageParts(mya).unit.replace(' ago', '')}`;
}

// First words that are proper nouns or genus names, which must keep their capital mid-sentence.
const KEEP_CAPS = new Set(('African Amborella American Anna\'s Antarctic Aquifex Arizona Asian Atlantic Australian Banna Bornean Burmese California Cape ' +
  'Candida Capsaspora Chlamydia Chlamydomonas China Chinese Conan Cryptococcus E. English Euglena Eurasian European Florida Galápagos Giardia Gila ' +
  'Hoffmann\'s Iberian Indian Japanese Komodo Lyme Nile North Norway Pacific Paramecium Philippine Portuguese Prochlorococcus Pseudomonas Roman ' +
  'Salmonella Senegal Siamese South Streptomyces Sunda Tasmanian Tetrahymena Thermus Toxoplasma Trichoplax Venus Virginia Volvox Welwitschia West').split(' '));

/** A common name as it reads mid-sentence: "the blue whale", but "the American robin". */
export function lcName(name: string) {
  const first = name.split(/[ -]/)[0];
  return KEEP_CAPS.has(first) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}
