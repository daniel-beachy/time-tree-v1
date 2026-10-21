// Guided tours. Text may contain {Sci name A|Sci name B} tokens, which are replaced with the live
// divergence time from the data, so the narration can never drift from the numbers on screen.

export interface TourStep {
  title: string;
  text: string;
  /** species shown in the step's tree (scientific names) */
  species: string[];
  /** pair whose common ancestor gets highlighted */
  focus?: [string, string];
  /** world event ids to mark on the tree */
  events?: string[];
}

export interface Tour { id: string; emoji: string; title: string; teaser: string; steps: TourStep[] }

export const TOURS: Tour[] = [
  {
    id: 'fish-to-you',
    emoji: '🐟',
    title: 'From fish to you',
    teaser: 'Meet your relatives, one ancestor at a time — 750 million years of family history.',
    steps: [
      {
        title: 'Start with your closest cousin',
        text: 'Your closest living relatives are chimpanzees and bonobos. Your shared ancestor lived {Homo sapiens|Pan troglodytes} in Africa. Remember: chimps are cousins, not ancestors — they have been evolving for exactly as long as we have.',
        species: ['Homo sapiens', 'Pan troglodytes', 'Pan paniscus', 'Gorilla gorilla', 'Pongo pygmaeus'],
        focus: ['Homo sapiens', 'Pan troglodytes'],
      },
      {
        title: 'Primates and the age of dinosaurs',
        text: 'Go back further and lemurs join the family: the ancestor of all primates lived {Homo sapiens|Lemur catta} — while dinosaurs still ruled. Mice and rabbits branch off a little earlier, {Homo sapiens|Mus musculus}.',
        species: ['Homo sapiens', 'Macaca mulatta', 'Lemur catta', 'Mus musculus', 'Oryctolagus cuniculus'],
        focus: ['Homo sapiens', 'Lemur catta'],
        events: ['kpg'],
      },
      {
        title: 'Mammals: milk, fur, and a lucky escape',
        text: 'Kangaroos join at {Homo sapiens|Macropus giganteus}, and the egg-laying platypus at {Homo sapiens|Ornithorhynchus anatinus}. Every mammal — from bats to blue whales — descends from one small, furry ancestor that lived under the feet of the earliest dinosaurs.',
        species: ['Homo sapiens', 'Felis catus', 'Macropus giganteus', 'Ornithorhynchus anatinus'],
        focus: ['Homo sapiens', 'Ornithorhynchus anatinus'],
        events: ['dinos'],
      },
      {
        title: 'The egg that conquered land',
        text: 'Chickens, lizards and turtles share an ancestor with you from {Homo sapiens|Gallus gallus}. That ancestor laid eggs with a waterproof membrane — the "amniotic egg" — so it could breed far from water. Before that, frogs join the family at {Homo sapiens|Rana temporaria}.',
        species: ['Homo sapiens', 'Ornithorhynchus anatinus', 'Gallus gallus', 'Iguana iguana', 'Rana temporaria'],
        focus: ['Homo sapiens', 'Gallus gallus'],
        events: ['amniotes', 'permian'],
      },
      {
        title: 'You are a (very modified) fish',
        text: 'Lungfish and coelacanths are more closely related to you ({Homo sapiens|Protopterus annectens}) than they are to a salmon or a zebrafish ({Protopterus annectens|Danio rerio}). Your arms are their lobed fins, remodelled. Sharks join even earlier, at {Homo sapiens|Carcharodon carcharias}.',
        species: ['Homo sapiens', 'Rana temporaria', 'Protopterus annectens', 'Latimeria chalumnae', 'Danio rerio', 'Salmo salar', 'Carcharodon carcharias'],
        focus: ['Homo sapiens', 'Protopterus annectens'],
        events: ['tetrapods'],
      },
      {
        title: 'Back to the first animals',
        text: 'Starfish are surprisingly close relatives ({Homo sapiens|Asterias rubens}); insects and octopuses split from our line at {Homo sapiens|Drosophila melanogaster}. And sponges — the simplest animals — share our ancestor from {Homo sapiens|Amphimedon queenslandica}, before the Cambrian explosion filled the seas.',
        species: ['Homo sapiens', 'Danio rerio', 'Ciona intestinalis', 'Asterias rubens', 'Drosophila melanogaster', 'Octopus vulgaris', 'Aurelia aurita', 'Amphimedon queenslandica'],
        focus: ['Homo sapiens', 'Amphimedon queenslandica'],
        events: ['cambrian', 'snowball'],
      },
    ],
  },
  {
    id: 'whales',
    emoji: '🐋',
    title: "Why whales aren't fish",
    teaser: 'Whales look like fish — but their family secret is hiding in a river in Africa.',
    steps: [
      {
        title: 'Looks can deceive',
        text: 'A blue whale and a great white shark are both big, streamlined ocean hunters. But their last common ancestor lived {Balaenoptera musculus|Carcharodon carcharias} — before any animal walked on land. You are far closer to the whale: {Homo sapiens|Balaenoptera musculus}.',
        species: ['Balaenoptera musculus', 'Carcharodon carcharias', 'Homo sapiens'],
        focus: ['Balaenoptera musculus', 'Carcharodon carcharias'],
      },
      {
        title: 'Whales are hoofed mammals',
        text: 'The whale\'s closest living relative is the hippopotamus: they split {Balaenoptera musculus|Hippopotamus amphibius}. Cows and pigs are next-door cousins. Whales breathe air, nurse their young with milk and still carry tiny hip bones from their four-legged ancestors.',
        species: ['Balaenoptera musculus', 'Orcinus orca', 'Hippopotamus amphibius', 'Bos taurus', 'Sus scrofa', 'Equus caballus'],
        focus: ['Balaenoptera musculus', 'Hippopotamus amphibius'],
        events: ['himalaya'],
      },
      {
        title: 'Return to the sea',
        text: 'Fossils like Pakicetus (~50 million years ago) show wolf-sized, four-legged whale ancestors wading in shallow seas near the rising Himalayas. Within ~10 million years their descendants were fully aquatic. Toothed and baleen whales then split {Balaenoptera musculus|Tursiops truncatus}.',
        species: ['Balaenoptera musculus', 'Megaptera novaeangliae', 'Physeter macrocephalus', 'Tursiops truncatus', 'Orcinus orca', 'Monodon monoceros', 'Hippopotamus amphibius'],
        focus: ['Balaenoptera musculus', 'Tursiops truncatus'],
      },
      {
        title: 'Convergent evolution',
        text: 'Sharks, dolphins and extinct marine reptiles all evolved similar torpedo shapes independently, because water rewards the same design. Biologists call this convergent evolution — and it\'s exactly why family trees are built from DNA rather than looks. Manatees did it too, from an elephant-like ancestor: {Trichechus manatus|Loxodonta africana}.',
        species: ['Tursiops truncatus', 'Carcharodon carcharias', 'Trichechus manatus', 'Loxodonta africana', 'Hippopotamus amphibius'],
        focus: ['Trichechus manatus', 'Loxodonta africana'],
      },
    ],
  },
  {
    id: 'dinosaurs',
    emoji: '🐔',
    title: 'Birds are living dinosaurs',
    teaser: 'Your breakfast egg came from a dinosaur. Here\'s the family proof.',
    steps: [
      {
        title: 'A surprising trio',
        text: 'Which pair is closest: chicken, alligator, or lizard? The chicken and the alligator ({Gallus gallus|Alligator mississippiensis}) are closer to each other than the alligator is to any lizard ({Alligator mississippiensis|Iguana iguana}). "Reptile" isn\'t one neat branch at all.',
        species: ['Gallus gallus', 'Alligator mississippiensis', 'Iguana iguana', 'Python bivittatus'],
        focus: ['Gallus gallus', 'Alligator mississippiensis'],
      },
      {
        title: 'The ruling reptiles',
        text: 'Birds and crocodiles are the last two survivors of the archosaurs ("ruling reptiles"), a group that also included every dinosaur and pterosaur. Birds evolved from small, feathered, meat-eating dinosaurs — the same branch as Velociraptor and T. rex.',
        species: ['Gallus gallus', 'Struthio camelus', 'Aptenodytes forsteri', 'Alligator mississippiensis', 'Crocodylus niloticus', 'Chelonia mydas', 'Iguana iguana'],
        focus: ['Gallus gallus', 'Crocodylus niloticus'],
        events: ['dinos', 'archaeopteryx'],
      },
      {
        title: 'Surviving the asteroid',
        text: 'When the asteroid struck 66 million years ago, the only dinosaurs to survive were birds. DNA suggests several bird lineages had already split before the impact — ostriches from chickens {Struthio camelus|Gallus gallus}, ducks from chickens {Anas platyrhynchos|Gallus gallus} — and then they radiated into the ~11,000 species alive today.',
        species: ['Struthio camelus', 'Gallus gallus', 'Anas platyrhynchos', 'Columba livia', 'Aptenodytes forsteri', 'Passer domesticus', 'Falco peregrinus', 'Ara macao'],
        focus: ['Struthio camelus', 'Gallus gallus'],
        events: ['kpg'],
      },
    ],
  },
  {
    id: 'mushrooms',
    emoji: '🍄',
    title: "You're closer to a mushroom than to a plant",
    teaser: 'The weirdest family reunion: animals and fungi are surprisingly close.',
    steps: [
      {
        title: 'Animal, vegetable… mushroom?',
        text: 'Mushrooms sit in the vegetable aisle, but genetically they belong with us. You and a button mushroom share an ancestor from {Homo sapiens|Agaricus bisporus}; the mushroom and a banana go back much further, {Agaricus bisporus|Musa acuminata}.',
        species: ['Homo sapiens', 'Agaricus bisporus', 'Musa acuminata', 'Quercus robur'],
        focus: ['Homo sapiens', 'Agaricus bisporus'],
      },
      {
        title: 'The opisthokonts',
        text: 'Animals and fungi form a group called Opisthokonta — "rear-tailed" — because their ancestor was a single cell propelled by one tail at its back. Your sperm cells still swim that way, and so do the spores of chytrid fungi.',
        species: ['Homo sapiens', 'Monosiga brevicollis', 'Agaricus bisporus', 'Saccharomyces cerevisiae', 'Batrachochytrium dendrobatidis', 'Arabidopsis thaliana'],
        focus: ['Homo sapiens', 'Saccharomyces cerevisiae'],
      },
      {
        title: 'Our single-celled cousins',
        text: 'The closest single-celled relatives of animals are choanoflagellates ({Homo sapiens|Monosiga brevicollis}), tiny collared cells that look almost exactly like the feeding cells inside sponges. Animals likely began as colonies of cells like these.',
        species: ['Homo sapiens', 'Amphimedon queenslandica', 'Monosiga brevicollis', 'Capsaspora owczarzaki', 'Agaricus bisporus'],
        focus: ['Homo sapiens', 'Monosiga brevicollis'],
        events: ['snowball'],
      },
    ],
  },
  {
    id: 'mammals',
    emoji: '☄️',
    title: 'After the asteroid',
    teaser: 'Did the dinosaurs\' extinction make room for mammals? The DNA tells a twist.',
    steps: [
      {
        title: 'The day the dinosaurs died',
        text: '66 million years ago a 10 km asteroid hit what is now Mexico. Three-quarters of species vanished. For a long time, people assumed mammals only began to diversify after that.',
        species: ['Homo sapiens', 'Felis catus', 'Equus caballus', 'Mus musculus', 'Loxodonta africana', 'Bradypus variegatus'],
        events: ['kpg'],
      },
      {
        title: 'A long fuse',
        text: 'Molecular clocks paint a more interesting picture. Many of the big mammal lineages had already split before the impact: primates from rodents {Homo sapiens|Mus musculus}, cats from horses {Felis catus|Equus caballus}, and elephants from sloths {Loxodonta africana|Bradypus variegatus}. They stayed small and hidden until the dinosaurs were gone.',
        species: ['Homo sapiens', 'Mus musculus', 'Felis catus', 'Equus caballus', 'Loxodonta africana', 'Bradypus variegatus', 'Macropus giganteus'],
        focus: ['Felis catus', 'Equus caballus'],
        events: ['kpg'],
      },
      {
        title: 'The explosion after',
        text: 'Within families, though, the big radiation came later. Lions and tigers split only {Panthera leo|Panthera tigris}, horses and rhinos {Equus caballus|Ceratotherium simum}, and whales from hippos {Balaenoptera musculus|Hippopotamus amphibius} — all long after the asteroid, when open niches let mammals grow large and spread everywhere.',
        species: ['Panthera leo', 'Panthera tigris', 'Felis catus', 'Equus caballus', 'Ceratotherium simum', 'Balaenoptera musculus', 'Hippopotamus amphibius'],
        focus: ['Panthera leo', 'Panthera tigris'],
        events: ['kpg', 'petm', 'grass'],
      },
    ],
  },
  {
    id: 'microbes',
    emoji: '🦠',
    title: 'Life before animals',
    teaser: 'For 3 billion years, Earth belonged to microbes. Meet the ancient branches.',
    steps: [
      {
        title: 'Three domains',
        text: 'All cellular life falls into three great branches: Bacteria, Archaea, and Eukaryotes (cells with a nucleus — including you). TimeTree places their common ancestor around {Homo sapiens|Escherichia coli}, not long after Earth cooled enough for oceans.',
        species: ['Homo sapiens', 'Escherichia coli', 'Halobacterium salinarum', 'Saccharomyces cerevisiae', 'Arabidopsis thaliana'],
        focus: ['Homo sapiens', 'Escherichia coli'],
        events: ['firstlife'],
      },
      {
        title: 'Bacteria changed the planet',
        text: 'Cyanobacteria invented oxygen-producing photosynthesis. Their waste gas built up during the Great Oxygenation, rusting the oceans and eventually making animal life possible. Even today, plants photosynthesise using captured cyanobacteria — chloroplasts.',
        species: ['Synechocystis sp. PCC 6803', 'Escherichia coli', 'Bacillus subtilis', 'Mycobacterium tuberculosis', 'Staphylococcus aureus'],
        focus: ['Escherichia coli', 'Bacillus subtilis'],
        events: ['goe'],
      },
      {
        title: 'The rise of complex cells',
        text: 'Eukaryotes appeared when one microbe engulfed another, which became the mitochondrion — your cells\' power plant. Plants, animals, fungi, kelp and malaria parasites all descend from that merger; they began splitting around {Homo sapiens|Arabidopsis thaliana}.',
        species: ['Homo sapiens', 'Saccharomyces cerevisiae', 'Arabidopsis thaliana', 'Plasmodium falciparum', 'Macrocystis pyrifera', 'Dictyostelium discoideum', 'Trypanosoma brucei'],
        focus: ['Homo sapiens', 'Arabidopsis thaliana'],
        events: ['eukaryotes'],
      },
    ],
  },
];
