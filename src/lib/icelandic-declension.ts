/**
 * Icelandic municipality names in dative case (þágufall).
 * Used after prepositions like "í" (in/at) which govern the dative.
 *
 * Nominative (nefnifall) → Dative (þágufall)
 * Only Icelandic needs this — English and Polish use the nominative form.
 */
const municipalityDativeMap: Record<string, string> = {
  // Höfuðborgarsvæðið
  "Reykjavík": "Reykjavík",
  "Kópavogur": "Kópavogi",
  "Seltjarnarnes": "Seltjarnarnesi",
  "Garðabær": "Garðabæ",
  "Hafnarfjörður": "Hafnarfirði",
  "Mosfellsbær": "Mosfellsbæ",
  "Kjósarhreppur": "Kjósarhreppi",

  // Suðurnes
  "Reykjanesbær": "Reykjanesbæ",
  "Grindavíkurbær": "Grindavíkurbæ",
  "Sandgerðisbær": "Sandgerðisbæ",
  "Sveitarfélagið Vogar": "Sveitarfélaginu Vogum",
  "Suðurnesjabær": "Suðurnesjabæ",

  // Vesturland
  "Akranes": "Akranesi",
  "Skorradalshreppur": "Skorradalshreppi",
  "Hvalfjarðarsveit": "Hvalfjarðarsveit",
  "Borgarbyggð": "Borgarbyggð",
  "Grundarfjarðarbær": "Grundarfjarðarbæ",
  "Helgafellssveit": "Helgafellssveit",
  "Stykkishólmsbær": "Stykkishólmsbæ",
  "Eyja- og Miklaholtshreppur": "Eyja- og Miklaholtshreppi",
  "Snæfellsbær": "Snæfellsbæ",
  "Dalabyggð": "Dalabyggð",

  // Vestfirðir
  "Reykhólahreppur": "Reykhólahreppi",
  "Vesturbyggð": "Vesturbyggð",
  "Ísafjarðarbær": "Ísafjarðarbæ",
  "Bolungarvíkurkaupstaður": "Bolungarvíkurkaupstað",
  "Strandabyggð": "Strandabyggð",
  "Kaldrananeshreppur": "Kaldrananeshreppi",
  "Árneshreppur": "Árneshreppi",

  // Norðurland vestra
  "Húnaþing vestra": "Húnaþingi vestra",
  "Húnabyggð": "Húnabyggð",
  "Skagabyggð": "Skagabyggð",
  "Sveitarfélagið Skagafjörður": "Sveitarfélaginu Skagafirði",
  "Skagafjörður": "Skagafirði",

  // Norðurland eystra
  "Akureyri": "Akureyri",
  "Norðurþing": "Norðurþingi",
  "Fjallabyggð": "Fjallabyggð",
  "Dalvíkurbyggð": "Dalvíkurbyggð",
  "Eyjafjarðarsveit": "Eyjafjarðarsveit",
  "Hörgársveit": "Hörgársveit",
  "Svalbarðsstrandarhreppur": "Svalbarðsstrandarhreppi",
  "Grýtubakkahreppur": "Grýtubakkahreppi",
  "Þingeyjarsveit": "Þingeyjarsveit",
  "Skútustaðahreppur": "Skútustaðahreppi",
  "Tjörneshreppur": "Tjörneshreppi",
  "Langanesbyggð": "Langanesbyggð",

  // Austurland
  "Seyðisfjörður": "Seyðisfirði",
  "Fljótsdalshérað": "Fljótsdalshéraði",
  "Múlaþing": "Múlaþingi",
  "Fjarðabyggð": "Fjarðabyggð",
  "Breiðdalshreppur": "Breiðdalshreppi",
  "Djúpavogshreppur": "Djúpavogshreppi",
  "Sveitarfélagið Hornafjörður": "Sveitarfélaginu Hornafirði",
  "Fljótsdalshreppur": "Fljótsdalshreppi",

  // Suðurland
  "Vestmannaeyjar": "Vestmannaeyjum",
  "Sveitarfélagið Árborg": "Sveitarfélaginu Árborg",
  "Mýrdalshreppur": "Mýrdalshreppi",
  "Skaftárhreppur": "Skaftárhreppi",
  "Ásahreppur": "Ásahreppi",
  "Rangárþing eystra": "Rangárþingi eystra",
  "Rangárþing ytra": "Rangárþingi ytra",
  "Hrunamannahreppur": "Hrunamannahreppi",
  "Bláskógabyggð": "Bláskógabyggð",
  "Flóahreppur": "Flóahreppi",
  "Sveitarfélagið Ölfus": "Sveitarfélaginu Ölfusi",
  "Grímsnes- og Grafningshreppur": "Grímsnes- og Grafningshreppi",
  "Skeiða- og Gnúpverjahreppur": "Skeiða- og Gnúpverjahreppi",
};

/**
 * Returns the dative form of an Icelandic municipality name.
 * Falls back to the nominative (original) form if not found in the map.
 */
export function getMunicipalityDative(nominative: string): string {
  return municipalityDativeMap[nominative] ?? nominative;
}
