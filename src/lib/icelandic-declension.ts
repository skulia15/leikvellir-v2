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
  "Seltjarnarnesbær": "Seltjarnarnesbæ",
  "Garðabær": "Garðabæ",
  "Hafnarfjörður": "Hafnarfirði",
  "Mosfellsbær": "Mosfellsbæ",
  "Kjósarhreppur": "Kjósarhreppi",

  // Suðurnes
  "Reykjanesbær": "Reykjanesbæ",
  "Grindavíkurbær": "Grindavíkurbæ",
  "Grindavík": "Grindavík",
  "Sandgerðisbær": "Sandgerðisbæ",
  "Sveitarfélagið Vogar": "Sveitarfélaginu Vogum",
  "Vogar": "Vogum",
  "Suðurnesjabær": "Suðurnesjabæ",

  // Vesturland
  "Akranes": "Akranesi",
  "Akraneskaupstaður": "Akraneskaupstað",
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
  "Ísafjörður": "Ísafirði",
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
  "Sauðárkrókur": "Sauðárkróki",
  "Blönduós": "Blönduósi",

  // Norðurland eystra
  "Akureyri": "Akureyri",
  "Akureyrarbær": "Akureyrarbæ",
  "Norðurþing": "Norðurþingi",
  "Húsavík": "Húsavík",
  "Fjallabyggð": "Fjallabyggð",
  "Siglufjörður": "Siglufirði",
  "Dalvíkurbyggð": "Dalvíkurbyggð",
  "Dalvík": "Dalvík",
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
  "Egilsstaðir": "Egilsstöðum",
  "Múlaþing": "Múlaþingi",
  "Fjarðabyggð": "Fjarðabyggð",
  "Breiðdalshreppur": "Breiðdalshreppi",
  "Djúpavogshreppur": "Djúpavogshreppi",
  "Sveitarfélagið Hornafjörður": "Sveitarfélaginu Hornafirði",
  "Hornafjörður": "Hornafirði",
  "Fljótsdalshreppur": "Fljótsdalshreppi",

  // Suðurland
  "Vestmannaeyjar": "Vestmannaeyjum",
  "Vestmannaeyjabær": "Vestmannaeyjabæ",
  "Sveitarfélagið Árborg": "Sveitarfélaginu Árborg",
  "Árborg": "Árborg",
  "Selfoss": "Selfossi",
  "Hveragerðisbær": "Hveragerðisbæ",
  "Hveragerði": "Hveragerði",
  "Mýrdalshreppur": "Mýrdalshreppi",
  "Skaftárhreppur": "Skaftárhreppi",
  "Ásahreppur": "Ásahreppi",
  "Rangárþing eystra": "Rangárþingi eystra",
  "Rangárþing ytra": "Rangárþingi ytra",
  "Hrunamannahreppur": "Hrunamannahreppi",
  "Bláskógabyggð": "Bláskógabyggð",
  "Flóahreppur": "Flóahreppi",
  "Sveitarfélagið Ölfus": "Sveitarfélaginu Ölfusi",
  "Ölfus": "Ölfusi",
  "Grímsnes- og Grafningshreppur": "Grímsnes- og Grafningshreppi",
  "Skeiða- og Gnúpverjahreppur": "Skeiða- og Gnúpverjahreppi",

  // Country fallback
  "Ísland": "Íslandi",
};

/**
 * Icelandic municipalities and towns that take the preposition "á" rather than "í".
 */
const municipalitiesTakingA = new Set<string>([
  "Akureyri",
  "Akranes",
  "Seltjarnarnes",
  "Seyðisfjörður",
  "Fljótsdalshérað",
  "Ísafjörður",
  "Sauðárkrókur",
  "Blönduós",
  "Húsavík",
  "Siglufjörður",
  "Dalvík",
  "Egilsstaðir",
  "Hornafjörður",
  "Selfoss",
  "Ísland",
]);

/**
 * Returns the dative form of an Icelandic municipality name.
 * Falls back to the nominative (original) form if not found in the map.
 */
export function getMunicipalityDative(nominative: string): string {
  return municipalityDativeMap[nominative] ?? nominative;
}

/**
 * Returns the grammatically correct Icelandic preposition ("í" or "á") for a municipality.
 */
export function getMunicipalityPreposition(nominative: string): "í" | "á" {
  return municipalitiesTakingA.has(nominative) ? "á" : "í";
}

/**
 * Formats an Icelandic municipality (or null/empty fallback) with its proper
 * preposition and dative case, e.g. "í Kópavogi", "á Akureyri", "á Íslandi".
 */
export function formatIcelandicLocation(municipality?: string | null): string {
  const trimmed = municipality?.trim();
  if (!trimmed) {
    return "á Íslandi";
  }
  return `${getMunicipalityPreposition(trimmed)} ${getMunicipalityDative(trimmed)}`;
}
