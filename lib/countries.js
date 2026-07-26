// @ts-check
// Canonical country list — the single source of truth for what a buyer's
// country may be, replacing the free-text input that shipped until 2026-07-26.
//
// WHY THIS EXISTS
// The checkout country field used to be a plain <input>. lib/vat.js matched it
// against a hardcoded list of English EU country names, so a buyer who typed
// their own country in their own language ("Deutschland", "Belgique") or made
// a typo fell straight through every branch to "Export (0% VAT)" — an invoice
// with no VAT on it at all, for an EU customer who owes 25%. The bug is silent:
// nothing errors, the order just gets the wrong tax treatment. Fixing that
// needs a closed set of values, not better string matching, which is what this
// file provides.
//
// TERRITORIES ARE LISTED SEPARATELY, WHICH PRESERVES EXISTING BEHAVIOUR
// Greenland, Faroe Islands, Åland, and the French overseas departments
// (Martinique, Guadeloupe, Réunion, French Guiana, Mayotte) belong to EU member
// states politically but sit outside the EU VAT area. Listing them as their own
// entries means getVatInfo() puts them on the export branch — which is exactly
// what the old hardcoded EU_COUNTRIES array did, since none of them appeared in
// it either. So this is the status quo carried forward deliberately, NOT a new
// tax judgment: it is not a claim about what is correct, only about what has
// not changed. If Dorte's accountant wants a different treatment for any of
// them, that is a live question — nothing here settles it.
//
// Uninhabited/administrative-only ISO entries (Antarctica, Bouvet Island, Heard
// Island, French Southern Territories, US Minor Outlying Islands, South
// Georgia) are deliberately omitted — nothing ships there.

/** @typedef {{ code: string, name: string, eu: boolean }} Country */

// ISO 3166-1 alpha-2 codes of the 27 EU member states (post-Brexit).
export const EU_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

// [alpha-2 code, canonical English name] — kept as tuples so the list stays
// readable and diffable. `eu` is derived from EU_CODES below rather than
// repeated per row, so the two can't drift apart.
const RAW = [
  ["AF", "Afghanistan"], ["AX", "Åland Islands"], ["AL", "Albania"], ["DZ", "Algeria"],
  ["AS", "American Samoa"], ["AD", "Andorra"], ["AO", "Angola"], ["AI", "Anguilla"],
  ["AG", "Antigua and Barbuda"], ["AR", "Argentina"], ["AM", "Armenia"], ["AW", "Aruba"],
  ["AU", "Australia"], ["AT", "Austria"], ["AZ", "Azerbaijan"], ["BS", "Bahamas"],
  ["BH", "Bahrain"], ["BD", "Bangladesh"], ["BB", "Barbados"], ["BY", "Belarus"],
  ["BE", "Belgium"], ["BZ", "Belize"], ["BJ", "Benin"], ["BM", "Bermuda"],
  ["BT", "Bhutan"], ["BO", "Bolivia"], ["BQ", "Bonaire, Sint Eustatius and Saba"],
  ["BA", "Bosnia and Herzegovina"], ["BW", "Botswana"], ["BR", "Brazil"],
  ["IO", "British Indian Ocean Territory"], ["BN", "Brunei"], ["BG", "Bulgaria"],
  ["BF", "Burkina Faso"], ["BI", "Burundi"], ["CV", "Cabo Verde"], ["KH", "Cambodia"],
  ["CM", "Cameroon"], ["CA", "Canada"], ["KY", "Cayman Islands"],
  ["CF", "Central African Republic"], ["TD", "Chad"], ["CL", "Chile"], ["CN", "China"],
  ["CX", "Christmas Island"], ["CC", "Cocos (Keeling) Islands"], ["CO", "Colombia"],
  ["KM", "Comoros"], ["CG", "Congo"], ["CD", "Congo (Democratic Republic)"],
  ["CK", "Cook Islands"], ["CR", "Costa Rica"], ["CI", "Côte d'Ivoire"], ["HR", "Croatia"],
  ["CU", "Cuba"], ["CW", "Curaçao"], ["CY", "Cyprus"], ["CZ", "Czechia"],
  ["DK", "Denmark"], ["DJ", "Djibouti"], ["DM", "Dominica"], ["DO", "Dominican Republic"],
  ["EC", "Ecuador"], ["EG", "Egypt"], ["SV", "El Salvador"], ["GQ", "Equatorial Guinea"],
  ["ER", "Eritrea"], ["EE", "Estonia"], ["SZ", "Eswatini"], ["ET", "Ethiopia"],
  ["FK", "Falkland Islands"], ["FO", "Faroe Islands"], ["FJ", "Fiji"], ["FI", "Finland"],
  ["FR", "France"], ["GF", "French Guiana"], ["PF", "French Polynesia"], ["GA", "Gabon"],
  ["GM", "Gambia"], ["GE", "Georgia"], ["DE", "Germany"], ["GH", "Ghana"],
  ["GI", "Gibraltar"], ["GR", "Greece"], ["GL", "Greenland"], ["GD", "Grenada"],
  ["GP", "Guadeloupe"], ["GU", "Guam"], ["GT", "Guatemala"], ["GG", "Guernsey"],
  ["GN", "Guinea"], ["GW", "Guinea-Bissau"], ["GY", "Guyana"], ["HT", "Haiti"],
  ["VA", "Holy See"], ["HN", "Honduras"], ["HK", "Hong Kong"], ["HU", "Hungary"],
  ["IS", "Iceland"], ["IN", "India"], ["ID", "Indonesia"], ["IR", "Iran"], ["IQ", "Iraq"],
  ["IE", "Ireland"], ["IM", "Isle of Man"], ["IL", "Israel"], ["IT", "Italy"],
  ["JM", "Jamaica"], ["JP", "Japan"], ["JE", "Jersey"], ["JO", "Jordan"],
  ["KZ", "Kazakhstan"], ["KE", "Kenya"], ["KI", "Kiribati"], ["KW", "Kuwait"],
  ["KG", "Kyrgyzstan"], ["LA", "Laos"], ["LV", "Latvia"], ["LB", "Lebanon"],
  ["LS", "Lesotho"], ["LR", "Liberia"], ["LY", "Libya"], ["LI", "Liechtenstein"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MO", "Macao"], ["MG", "Madagascar"],
  ["MW", "Malawi"], ["MY", "Malaysia"], ["MV", "Maldives"], ["ML", "Mali"], ["MT", "Malta"],
  ["MH", "Marshall Islands"], ["MQ", "Martinique"], ["MR", "Mauritania"], ["MU", "Mauritius"],
  ["YT", "Mayotte"], ["MX", "Mexico"], ["FM", "Micronesia"], ["MD", "Moldova"],
  ["MC", "Monaco"], ["MN", "Mongolia"], ["ME", "Montenegro"], ["MS", "Montserrat"],
  ["MA", "Morocco"], ["MZ", "Mozambique"], ["MM", "Myanmar"], ["NA", "Namibia"],
  ["NR", "Nauru"], ["NP", "Nepal"], ["NL", "Netherlands"], ["NC", "New Caledonia"],
  ["NZ", "New Zealand"], ["NI", "Nicaragua"], ["NE", "Niger"], ["NG", "Nigeria"],
  ["NU", "Niue"], ["NF", "Norfolk Island"], ["KP", "North Korea"], ["MK", "North Macedonia"],
  ["MP", "Northern Mariana Islands"], ["NO", "Norway"], ["OM", "Oman"], ["PK", "Pakistan"],
  ["PW", "Palau"], ["PS", "Palestine"], ["PA", "Panama"], ["PG", "Papua New Guinea"],
  ["PY", "Paraguay"], ["PE", "Peru"], ["PH", "Philippines"], ["PN", "Pitcairn"],
  ["PL", "Poland"], ["PT", "Portugal"], ["PR", "Puerto Rico"], ["QA", "Qatar"],
  ["RE", "Réunion"], ["RO", "Romania"], ["RU", "Russia"], ["RW", "Rwanda"],
  ["BL", "Saint Barthélemy"], ["SH", "Saint Helena"], ["KN", "Saint Kitts and Nevis"],
  ["LC", "Saint Lucia"], ["MF", "Saint Martin"], ["PM", "Saint Pierre and Miquelon"],
  ["VC", "Saint Vincent and the Grenadines"], ["WS", "Samoa"], ["SM", "San Marino"],
  ["ST", "Sao Tome and Principe"], ["SA", "Saudi Arabia"], ["SN", "Senegal"],
  ["RS", "Serbia"], ["SC", "Seychelles"], ["SL", "Sierra Leone"], ["SG", "Singapore"],
  ["SX", "Sint Maarten"], ["SK", "Slovakia"], ["SI", "Slovenia"], ["SB", "Solomon Islands"],
  ["SO", "Somalia"], ["ZA", "South Africa"], ["KR", "South Korea"], ["SS", "South Sudan"],
  ["ES", "Spain"], ["LK", "Sri Lanka"], ["SD", "Sudan"], ["SR", "Suriname"],
  ["SJ", "Svalbard and Jan Mayen"], ["SE", "Sweden"], ["CH", "Switzerland"], ["SY", "Syria"],
  ["TW", "Taiwan"], ["TJ", "Tajikistan"], ["TZ", "Tanzania"], ["TH", "Thailand"],
  ["TL", "Timor-Leste"], ["TG", "Togo"], ["TK", "Tokelau"], ["TO", "Tonga"],
  ["TT", "Trinidad and Tobago"], ["TN", "Tunisia"], ["TR", "Türkiye"], ["TM", "Turkmenistan"],
  ["TC", "Turks and Caicos Islands"], ["TV", "Tuvalu"], ["UG", "Uganda"], ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"],
  ["UY", "Uruguay"], ["UZ", "Uzbekistan"], ["VU", "Vanuatu"], ["VE", "Venezuela"],
  ["VN", "Vietnam"], ["VG", "Virgin Islands (British)"], ["VI", "Virgin Islands (U.S.)"],
  ["WF", "Wallis and Futuna"], ["EH", "Western Sahara"], ["YE", "Yemen"], ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
];

/**
 * Case/accent/punctuation-insensitive key. "Türkiye", "TURKIYE" and "turkiye"
 * all fold to the same string; so do "U.S.A." and "usa". Used both for
 * matching input and for ordering the list.
 * @param {string} s
 */
function fold(s) {
  return String(s)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "") // strip combining accents
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation -> space
    .trim()
    .toLowerCase();
}

/**
 * @type {Country[]} Alphabetical by English name — the order the <select>
 * renders in. Sorted on the folded name with a plain comparison rather than
 * `localeCompare`: this list is rendered on the server AND hydrated on the
 * client, and `localeCompare` silently falls back to code-unit order on a
 * small-ICU Node build, which would move the six accented entries (Åland,
 * Côte d'Ivoire, Curaçao, Réunion, Saint Barthélemy, Türkiye) to the end and
 * produce a hydration mismatch across the whole list. Folding first also puts
 * "Åland Islands" next to "Afghanistan" where a reader expects it, which
 * code-unit order would not.
 */
export const COUNTRIES = RAW.map(([code, name]) => ({ code, name, eu: EU_CODES.has(code) })).sort(
  (a, b) => {
    const x = fold(a.name), y = fold(b.name);
    return x < y ? -1 : x > y ? 1 : 0;
  }
);

// Alternative spellings accepted on INPUT only. Both entry points are closed
// <select>s now, so these can only ever be hit by (a) rows written before the
// picker existed and (b) direct API calls. That is what keeps the scope tight:
// the local-language names of European markets DEE actually sells into, plus
// the handful of abbreviations people reflexively type. It is not an attempt
// at an exhaustive synonym table — an unknown string resolves to null and the
// buyer is asked to pick from the list, which is the correct outcome.
// Keys are matched after fold(), so accents/case/punctuation here are cosmetic.
const ALIASES = {
  // Nordics — "Danmark" is Dorte's own stored profile value
  danmark: "DK", danemark: "DK", "dänemark": "DK",
  sverige: "SE", schweden: "SE", suede: "SE",
  norge: "NO", noreg: "NO", norwegen: "NO",
  suomi: "FI", finnland: "FI",
  "faeroe islands": "FO", faroerne: "FO",
  "grønland": "GL",
  aland: "AX", "aland islands": "AX",

  // Western Europe
  deutschland: "DE", allemagne: "DE", germania: "DE", alemania: "DE",
  "österreich": "AT", oesterreich: "AT", autriche: "AT",
  "belgië": "BE", belgie: "BE", belgique: "BE", belgien: "BE",
  nederland: "NL", holland: "NL", "the netherlands": "NL", "pays bas": "NL", niederlande: "NL",
  schweiz: "CH", suisse: "CH", svizzera: "CH",
  "españa": "ES", espana: "ES", espagne: "ES", spanien: "ES",
  italia: "IT", italie: "IT", italien: "IT",
  "éire": "IE", eire: "IE", "republic of ireland": "IE", irland: "IE", irlande: "IE",
  luxemburg: "LU",
  frankreich: "FR", francia: "FR",
  ellada: "GR", hellas: "GR", griechenland: "GR", grece: "GR",

  // UK — every form people type, none of which is the canonical name
  uk: "GB", "u k": "GB", "united kingdom of great britain and northern ireland": "GB",
  "great britain": "GB", britain: "GB", england: "GB", scotland: "GB", wales: "GB",
  "northern ireland": "GB", gbr: "GB",

  // Central + Eastern Europe
  polska: "PL", polen: "PL", pologne: "PL",
  "česko": "CZ", cesko: "CZ", "czech republic": "CZ", "ceska republika": "CZ", tschechien: "CZ",
  slovensko: "SK", "slovak republic": "SK",
  slovenija: "SI",
  hrvatska: "HR", kroatien: "HR",
  "magyarország": "HU", magyarorszag: "HU", ungarn: "HU",
  "rumänien": "RO",
  "българия": "BG", bulgarien: "BG",
  eesti: "EE", estland: "EE",
  latvija: "LV", lettland: "LV",
  lietuva: "LT", litauen: "LT",
  "κύπρος": "CY", kypros: "CY", zypern: "CY",
  srbija: "RS", "србија": "RS", serbien: "RS",
  "россия": "RU", "russian federation": "RU", russland: "RU",
  "україна": "UA", ukraina: "UA",
  macedonia: "MK", "republic of north macedonia": "MK",
  bosnia: "BA", "bosnia herzegovina": "BA",
  "crna gora": "ME",
  "republic of moldova": "MD",

  // Non-European markets, only the forms that are genuinely ambiguous
  usa: "US", us: "US", "u s a": "US", "u s": "US", "united states of america": "US", america: "US",
  uae: "AE", emirates: "AE",
  korea: "KR", "republic of korea": "KR", "south korea": "KR",
  turkey: "TR", turkiye: "TR",
  "viet nam": "VN",
  "hong kong sar": "HK", hongkong: "HK",
  "state of palestine": "PS",
  "democratic republic of the congo": "CD", "republic of the congo": "CG",
  "ivory coast": "CI",
  "cape verde": "CV",
  "east timor": "TL",
  "vatican city": "VA", vatican: "VA",
};

// name/alias -> alpha-2, built once at module load.
const LOOKUP = new Map();
for (const { code, name } of COUNTRIES) {
  LOOKUP.set(fold(name), code);
  LOOKUP.set(fold(code), code);
}
for (const [alias, code] of Object.entries(ALIASES)) LOOKUP.set(fold(alias), code);

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/**
 * Resolve any user-supplied country string to its ISO alpha-2 code.
 * Returns null for blank or unrecognized input — callers decide whether that's
 * an error (order creation) or just "leave it alone" (rendering an old row).
 * @param {string | null | undefined} input
 * @returns {string | null}
 */
export function countryCode(input) {
  if (!input) return null;
  return LOOKUP.get(fold(input)) || null;
}

/**
 * Resolve any user-supplied country string to its canonical English name.
 * Returns null if unrecognized — never guesses.
 * @param {string | null | undefined} input
 * @returns {string | null}
 */
export function normalizeCountry(input) {
  const code = countryCode(input);
  return code ? BY_CODE.get(code).name : null;
}

/**
 * @param {string | null | undefined} input
 * @returns {boolean}
 */
export function isEuCountry(input) {
  const code = countryCode(input);
  return code ? EU_CODES.has(code) : false;
}

/**
 * @param {string | null | undefined} input
 * @returns {boolean}
 */
export function isDenmark(input) {
  return countryCode(input) === "DK";
}
