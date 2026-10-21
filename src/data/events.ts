// World events used as context on every timeline. Ages in millions of years ago (Mya).
// Dates follow the ICS International Chronostratigraphic Chart and standard references;
// where science gives a range, `age` is the commonly cited midpoint/onset and `end` closes the span.

export type EventKind = 'extinction' | 'climate' | 'earth' | 'life' | 'human';

export interface WorldEvent {
  id: string;
  age: number;
  end?: number;
  title: string;
  kind: EventKind;
  icon: string;
  blurb: string;
  /** Wikipedia article for "read more" */
  wiki: string;
  /** show on compact timelines */
  major?: boolean;
}

export const EVENTS: WorldEvent[] = [
  { id: 'earth', age: 4540, title: 'Earth forms', kind: 'earth', icon: '🌍', major: true, wiki: 'Age_of_Earth',
    blurb: 'Dust and rock around the young Sun clump together into our planet. A Mars-sized impact soon after creates the Moon.' },
  { id: 'oceans', age: 4400, title: 'First oceans', kind: 'earth', icon: '🌊', wiki: 'Origin_of_water_on_Earth',
    blurb: 'Tiny zircon crystals from Australia show liquid water existed only ~150 million years after Earth formed.' },
  { id: 'firstlife', age: 3700, title: 'Earliest signs of life', kind: 'life', icon: '🦠', major: true, wiki: 'Earliest_known_life_forms',
    blurb: 'Chemical traces and layered microbial mats (stromatolites) suggest single-celled life was already thriving.' },
  { id: 'goe', age: 2400, end: 2100, title: 'Great Oxygenation', kind: 'climate', icon: '💨', major: true, wiki: 'Great_Oxidation_Event',
    blurb: 'Cyanobacteria had been releasing oxygen for ages; now it finally builds up in the air. Rust-red rocks form worldwide — and oxygen poisons many microbes.' },
  { id: 'eukaryotes', age: 1650, title: 'First complex cells', kind: 'life', icon: '🔬', wiki: 'Eukaryote',
    blurb: 'Fossils of eukaryotes appear: cells with a nucleus, built when one microbe swallowed another that became the mitochondrion.' },
  { id: 'redalgae', age: 1050, title: 'First multicellular algae', kind: 'life', icon: '🌿', wiki: 'Bangiomorpha',
    blurb: 'Bangiomorpha, a red alga, is the oldest known organism with sexual reproduction and clearly specialised cells.' },
  { id: 'snowball', age: 720, end: 635, title: 'Snowball Earth', kind: 'climate', icon: '🧊', major: true, wiki: 'Snowball_Earth',
    blurb: 'Ice sheets may have reached the equator, twice. When the ice retreated, complex life took off soon after.' },
  { id: 'ediacaran', age: 575, title: 'First large animals', kind: 'life', icon: '🪸', wiki: 'Ediacaran_biota',
    blurb: 'The strange, soft-bodied Ediacaran creatures — fronds, discs and quilts — are the first big multicellular life.' },
  { id: 'cambrian', age: 538.8, end: 515, title: 'Cambrian explosion', kind: 'life', icon: '💥', major: true, wiki: 'Cambrian_explosion',
    blurb: 'Most major animal body plans appear in the fossil record in a geological eye-blink: eyes, shells, legs, guts.' },
  { id: 'landplants', age: 470, title: 'Plants move onto land', kind: 'life', icon: '🌱', major: true, wiki: 'Evolutionary_history_of_plants',
    blurb: 'Fossil spores show the first moss-like plants colonising bare rock, slowly creating the first soils.' },
  { id: 'ordovician', age: 445, title: 'End-Ordovician extinction', kind: 'extinction', icon: '☠️', wiki: 'Late_Ordovician_mass_extinction',
    blurb: 'A sudden ice age drains shallow seas. About 85% of marine species vanish — the first of the "Big Five" mass extinctions.' },
  { id: 'tetrapods', age: 375, title: 'Fish crawl onto land', kind: 'life', icon: '🐟', major: true, wiki: 'Tiktaalik',
    blurb: 'Tiktaalik, a fish with a neck and sturdy fins, shows the transition toward four-legged land animals — our own ancestors.' },
  { id: 'devonian', age: 372, title: 'Late Devonian extinction', kind: 'extinction', icon: '☠️', wiki: 'Late_Devonian_extinction',
    blurb: 'Reef ecosystems collapse in a series of pulses; up to 75% of species are lost.' },
  { id: 'coal', age: 359, end: 299, title: 'Coal forests & giant insects', kind: 'life', icon: '🪲', wiki: 'Carboniferous',
    blurb: 'Vast swamp forests bury so much carbon that oxygen soars — dragonfly relatives reach 70 cm wingspans.' },
  { id: 'amniotes', age: 312, title: 'First egg-layers on land', kind: 'life', icon: '🥚', wiki: 'Amniote',
    blurb: 'The amniotic egg frees animals from water to breed. Its owners split into the lines leading to mammals and to reptiles & birds.' },
  { id: 'pangaea', age: 335, title: 'Pangaea assembles', kind: 'earth', icon: '🗺️', wiki: 'Pangaea',
    blurb: 'All the continents collide into one supercontinent surrounded by a single ocean.' },
  { id: 'permian', age: 251.9, title: 'The Great Dying', kind: 'extinction', icon: '🌋', major: true, wiki: 'Permian–Triassic_extinction_event',
    blurb: 'Siberian volcanoes heat and acidify the planet. Around 90% of marine and 70% of land species die — the worst extinction ever.' },
  { id: 'dinos', age: 233, title: 'First dinosaurs', kind: 'life', icon: '🦕', major: true, wiki: 'Origin_of_dinosaurs',
    blurb: 'Small, two-legged dinosaurs appear in what is now Argentina and Brazil.' },
  { id: 'mammals', age: 225, title: 'First mammal relatives', kind: 'life', icon: '🐭', wiki: 'Mammaliaformes',
    blurb: 'Tiny, furry, probably nocturnal mammaliaforms scurry in the shadow of the dinosaurs.' },
  { id: 'triassic', age: 201.4, title: 'End-Triassic extinction', kind: 'extinction', icon: '☠️', wiki: 'Triassic–Jurassic_extinction_event',
    blurb: 'Volcanic eruptions as Pangaea splits wipe out many rivals, leaving dinosaurs to dominate the land.' },
  { id: 'breakup', age: 180, title: 'Pangaea breaks apart', kind: 'earth', icon: '🧩', major: true, wiki: 'Pangaea#Rifting_and_break-up',
    blurb: 'The supercontinent rifts apart. Isolated continents become separate evolutionary laboratories (think Australia and its marsupials).' },
  { id: 'archaeopteryx', age: 150, title: 'Archaeopteryx', kind: 'life', icon: '🪶', wiki: 'Archaeopteryx',
    blurb: 'A feathered dinosaur with wings and teeth — a famous snapshot of birds evolving from dinosaurs.' },
  { id: 'flowers', age: 130, title: 'First flowers', kind: 'life', icon: '🌸', major: true, wiki: 'Flowering_plant',
    blurb: 'Flowering plants appear in the fossil record and quickly spread, along with the insects that pollinate them.' },
  { id: 'kpg', age: 66, title: 'Asteroid ends the dinosaurs', kind: 'extinction', icon: '☄️', major: true, wiki: 'Cretaceous–Paleogene_extinction_event',
    blurb: 'A 10 km asteroid hits Mexico\'s Yucatán. All non-bird dinosaurs die out; mammals and birds inherit the planet.' },
  { id: 'petm', age: 56, title: 'Global hot spell (PETM)', kind: 'climate', icon: '🔥', wiki: 'Paleocene–Eocene_Thermal_Maximum',
    blurb: 'A rapid carbon release warms Earth by 5–8 °C. The first primates, horses and hoofed mammals spread across continents.' },
  { id: 'himalaya', age: 50, title: 'India hits Asia', kind: 'earth', icon: '🏔️', wiki: 'Himalayas',
    blurb: 'The collision starts pushing up the Himalayas. Around the same time, whale ancestors start returning to the sea.' },
  { id: 'antarctica', age: 34, title: 'Antarctica freezes', kind: 'climate', icon: '❄️', wiki: 'Eocene–Oligocene_extinction_event',
    blurb: 'Antarctica separates from South America, a cold current circles it, and a permanent ice sheet forms.' },
  { id: 'grass', age: 8, title: 'Grasslands spread', kind: 'climate', icon: '🌾', wiki: 'Grassland',
    blurb: 'A drying, cooling climate lets grasslands replace forests in Africa and elsewhere — shaping grazers, and our ancestors.' },
  { id: 'messinian', age: 5.97, end: 5.33, title: 'Mediterranean dries up', kind: 'earth', icon: '🏜️', wiki: 'Messinian_salinity_crisis',
    blurb: 'Cut off from the Atlantic, the Mediterranean Sea nearly evaporates before refilling in a colossal flood.' },
  { id: 'tools', age: 3.3, title: 'First stone tools', kind: 'human', icon: '🪨', wiki: 'Lomekwi',
    blurb: 'Hominins in Kenya start knapping stone tools — before our own genus Homo existed.' },
  { id: 'panama', age: 2.8, title: 'The Americas join', kind: 'earth', icon: '🌉', wiki: 'Great_American_Interchange',
    blurb: 'The Isthmus of Panama closes. Animals swap continents: armadillos head north, cats and bears head south.' },
  { id: 'iceages', age: 2.58, title: 'Ice ages begin', kind: 'climate', icon: '🧊', major: true, wiki: 'Quaternary_glaciation',
    blurb: 'Glaciers start advancing and retreating every 41,000–100,000 years — a rhythm that continues today.' },
  { id: 'sapiens', age: 0.3, title: 'Homo sapiens appears', kind: 'human', icon: '🧍', major: true, wiki: 'Early_modern_human',
    blurb: 'The oldest fossils of our species, from Jebel Irhoud in Morocco, date to about 300,000 years ago.' },
  { id: 'outofafrica', age: 0.07, title: 'Humans spread worldwide', kind: 'human', icon: '👣', wiki: 'Recent_African_origin_of_modern_humans',
    blurb: 'Modern humans leave Africa and eventually reach every continent except Antarctica.' },
  { id: 'farming', age: 0.0117, title: 'Farming begins', kind: 'human', icon: '🌾', wiki: 'Neolithic_Revolution',
    blurb: 'As the last ice age ends, people in the Fertile Crescent domesticate wheat, barley, goats and sheep.' },
];

export interface Interval { name: string; start: number; end: number; color: string; level: 'eon' | 'era' | 'period' }

// ICS chart (v2023). Colours are muted versions of the official ICS colours.
export const INTERVALS: Interval[] = [
  { name: 'Hadean', start: 4567, end: 4031, color: '#ae027e', level: 'eon' },
  { name: 'Archean', start: 4031, end: 2500, color: '#f0047f', level: 'eon' },
  { name: 'Proterozoic', start: 2500, end: 538.8, color: '#f73563', level: 'eon' },
  { name: 'Phanerozoic', start: 538.8, end: 0, color: '#9ad9dd', level: 'eon' },
  { name: 'Paleozoic', start: 538.8, end: 251.9, color: '#99c08d', level: 'era' },
  { name: 'Mesozoic', start: 251.9, end: 66, color: '#67c5ca', level: 'era' },
  { name: 'Cenozoic', start: 66, end: 0, color: '#f2f91d', level: 'era' },
  { name: 'Cambrian', start: 538.8, end: 485.4, color: '#7fa056', level: 'period' },
  { name: 'Ordovician', start: 485.4, end: 443.8, color: '#009270', level: 'period' },
  { name: 'Silurian', start: 443.8, end: 419.2, color: '#b3e1b6', level: 'period' },
  { name: 'Devonian', start: 419.2, end: 358.9, color: '#cb8c37', level: 'period' },
  { name: 'Carboniferous', start: 358.9, end: 298.9, color: '#67a599', level: 'period' },
  { name: 'Permian', start: 298.9, end: 251.9, color: '#f04028', level: 'period' },
  { name: 'Triassic', start: 251.9, end: 201.4, color: '#812b92', level: 'period' },
  { name: 'Jurassic', start: 201.4, end: 145, color: '#34b2c9', level: 'period' },
  { name: 'Cretaceous', start: 145, end: 66, color: '#7fc64e', level: 'period' },
  { name: 'Paleogene', start: 66, end: 23.03, color: '#fd9a52', level: 'period' },
  { name: 'Neogene', start: 23.03, end: 2.58, color: '#ffe619', level: 'period' },
  { name: 'Quaternary', start: 2.58, end: 0, color: '#f9f97f', level: 'period' },
];

export const EVENT_COLORS: Record<EventKind, string> = {
  extinction: '#ff6b81',
  climate: '#7cc7ff',
  earth: '#ffb46b',
  life: '#5ef0c8',
  human: '#c9a7ff',
};
