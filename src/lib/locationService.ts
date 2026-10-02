/**
 * Comprehensive Dhaka & Bangladesh Location, Hospital, and Geocoding Service.
 * Provides accurate GPS coordinates for all major Dhaka zones, neighborhoods,
 * and tertiary care hospitals.
 */

export interface LocationEntry {
  name: string;
  category: "AREA" | "HOSPITAL";
  lat: number;
  lng: number;
  parentArea?: string;
  aliases?: string[];
}

// 1. Comprehensive Dhaka Neighborhoods & Zones (including Aftabnagar, Badda, Banasree, etc.)
export const DHAKA_AREAS: LocationEntry[] = [
  { name: "Aftabnagar", category: "AREA", lat: 23.7645, lng: 90.4320, aliases: ["aftab nagar", "aftabnagar", "east rampura"] },
  { name: "Banani", category: "AREA", lat: 23.7937, lng: 90.4066, aliases: ["banani", "banani d長hs", "banani bazar"] },
  { name: "Gulshan 1", category: "AREA", lat: 23.7808, lng: 90.4167, aliases: ["gulshan 1", "gulshan-1", "gulshan circle 1"] },
  { name: "Gulshan 2", category: "AREA", lat: 23.7925, lng: 90.4167, aliases: ["gulshan 2", "gulshan-2", "gulshan circle 2", "gulshan"] },
  { name: "Baridhara", category: "AREA", lat: 23.8030, lng: 90.4230, aliases: ["baridhara", "baridhara diplomatic zone", "baridhara j block"] },
  { name: "Baridhara DOHS", category: "AREA", lat: 23.8115, lng: 90.4190, aliases: ["baridhara dohs", "dohs baridhara"] },
  { name: "Bashundhara R/A", category: "AREA", lat: 23.8150, lng: 90.4340, aliases: ["bashundhara", "bashundhara r/a", "bashundhara residential area"] },
  { name: "Badda", category: "AREA", lat: 23.7805, lng: 90.4267, aliases: ["badda", "north badda", "south badda", "merul badda", "middle badda"] },
  { name: "Banasree", category: "AREA", lat: 23.7635, lng: 90.4385, aliases: ["banasree", "bonosree", "rampura banasree"] },
  { name: "Dhanmondi", category: "AREA", lat: 23.7465, lng: 90.3760, aliases: ["dhanmondi", "dhanmondi 27", "dhanmondi 32", "dhanmondi lake"] },
  { name: "Panthapath", category: "AREA", lat: 23.7510, lng: 90.3840, aliases: ["panthapath", "russell square", "green road panthapath"] },
  { name: "Kalabagan", category: "AREA", lat: 23.7490, lng: 90.3800, aliases: ["kalabagan", "kolabagan", "lake circus"] },
  { name: "Farmgate", category: "AREA", lat: 23.7570, lng: 90.3880, aliases: ["farmgate", "khamarbari", "ananda cinema"] },
  { name: "Tejgaon", category: "AREA", lat: 23.7590, lng: 90.3990, aliases: ["tejgaon", "tejgaon industrial area", "nabisco", "tibetan"] },
  { name: "Mohakhali", category: "AREA", lat: 23.7780, lng: 90.4010, aliases: ["mohakhali", "mohakhali wireless", "tb gate", "amatoli"] },
  { name: "Mohakhali DOHS", category: "AREA", lat: 23.7770, lng: 90.3930, aliases: ["mohakhali dohs", "dohs mohakhali"] },
  { name: "Mirpur 1", category: "AREA", lat: 23.7950, lng: 90.3530, aliases: ["mirpur 1", "mirpur-1", "muktijoddha market"] },
  { name: "Mirpur 2", category: "AREA", lat: 23.8050, lng: 90.3600, aliases: ["mirpur 2", "mirpur-2", "stadium mirpur"] },
  { name: "Mirpur 10", category: "AREA", lat: 23.8070, lng: 90.3685, aliases: ["mirpur 10", "mirpur-10", "mirpur circle 10", "mirpur 11"] },
  { name: "Mirpur 14", category: "AREA", lat: 23.8180, lng: 90.3860, aliases: ["mirpur 14", "mirpur-14", "cantonment mirpur"] },
  { name: "Mohammadpur", category: "AREA", lat: 23.7660, lng: 90.3580, aliases: ["mohammadpur", "town hall", "tajmahal road", "nurjahan road", "salimullah road"] },
  { name: "Adabor", category: "AREA", lat: 23.7740, lng: 90.3540, aliases: ["adabor", "shekhertek", "baitul aman housing"] },
  { name: "Shyamoli", category: "AREA", lat: 23.7730, lng: 90.3610, aliases: ["shyamoli", "shyamoli square", "ring road"] },
  { name: "Kalyanpur", category: "AREA", lat: 23.7820, lng: 90.3580, aliases: ["kalyanpur", "kallyanpur", "gabtoli road"] },
  { name: "Uttara", category: "AREA", lat: 23.8730, lng: 90.3965, aliases: ["uttara", "uttara sector 1", "uttara sector 3", "uttara sector 7", "uttara sector 10", "uttara sector 11", "azampur", "house building"] },
  { name: "Shahbagh", category: "AREA", lat: 23.7340, lng: 90.3960, aliases: ["shahbagh", "shahbag", "dhaka university", "tsc"] },
  { name: "Motijheel", category: "AREA", lat: 23.7330, lng: 90.4170, aliases: ["motijheel", "dilkusha", "shapla chattar"] },
  { name: "Khilgaon", category: "AREA", lat: 23.7515, lng: 90.4250, aliases: ["khilgaon", "goran", "sipahibagh", "taltola"] },
  { name: "Malibagh", category: "AREA", lat: 23.7470, lng: 90.4130, aliases: ["malibagh", "mouchak", "shantinagar", "chamelibagh"] },
  { name: "Mogbazar", category: "AREA", lat: 23.7505, lng: 90.4020, aliases: ["mogbazar", "moghbazar", "wireless mor", "eskaton"] },
  { name: "Rampura", category: "AREA", lat: 23.7620, lng: 90.4180, aliases: ["rampura", "rampura bridge", "hatirjheel rampura", "hazipara"] },
  { name: "Nikunja", category: "AREA", lat: 23.8290, lng: 90.4195, aliases: ["nikunja", "nikunja 1", "nikunja 2", "khilkhet"] },
  { name: "Kuril", category: "AREA", lat: 23.8180, lng: 90.4260, aliases: ["kuril", "kuril flyover", "vatara", "notun bazar"] },
  { name: "Puran Dhaka", category: "AREA", lat: 23.7120, lng: 90.4005, aliases: ["puran dhaka", "old dhaka", "lalbagh", "armanitola", "sadarghat", "chawkbazar"] },
  { name: "Wari", category: "AREA", lat: 23.7190, lng: 90.4190, aliases: ["wari", "tikatuli", "gendaria", "swamibagh"] },
  { name: "Savar", category: "AREA", lat: 23.8560, lng: 90.2600, aliases: ["savar", "hemayetpur", "ashulia"] },
];

// 2. Comprehensive Dhaka Hospital Directory with Verified Coordinates
export const DHAKA_HOSPITALS: LocationEntry[] = [
  {
    name: "Dhaka Medical College Hospital (DMCH)",
    category: "HOSPITAL",
    lat: 23.7258,
    lng: 90.3975,
    parentArea: "Shahbagh",
    aliases: ["dmch", "dhaka medical", "dhaka medical college", "bakshibazar"],
  },
  {
    name: "Square Hospital",
    category: "HOSPITAL",
    lat: 23.7533,
    lng: 90.3817,
    parentArea: "Panthapath",
    aliases: ["square", "square hospital", "panthapath square"],
  },
  {
    name: "Evercare Hospital Dhaka",
    category: "HOSPITAL",
    lat: 23.8103,
    lng: 90.4312,
    parentArea: "Bashundhara R/A",
    aliases: ["evercare", "apollo", "apollo hospital", "evercare bashundhara"],
  },
  {
    name: "United Hospital",
    category: "HOSPITAL",
    lat: 23.7998,
    lng: 90.4208,
    parentArea: "Gulshan 2",
    aliases: ["united", "united hospital", "united gulshan"],
  },
  {
    name: "BIRDEM General Hospital",
    category: "HOSPITAL",
    lat: 23.7382,
    lng: 90.3957,
    parentArea: "Shahbagh",
    aliases: ["birdem", "birdem 1", "birdem shahbagh", "diabetic hospital"],
  },
  {
    name: "Bangabandhu Sheikh Mujib Medical University (BSMMU)",
    category: "HOSPITAL",
    lat: 23.7390,
    lng: 90.3960,
    parentArea: "Shahbagh",
    aliases: ["bsmmu", "pg hospital", "p.g. hospital", "bangabandhu medical"],
  },
  {
    name: "Anwer Khan Modern Hospital",
    category: "HOSPITAL",
    lat: 23.7485,
    lng: 90.3802,
    parentArea: "Dhanmondi",
    aliases: ["anwer khan", "anwar khan", "akmmc", "anwer khan modern medical college"],
  },
  {
    name: "Popular Diagnostic & Hospital Dhanmondi",
    category: "HOSPITAL",
    lat: 23.7485,
    lng: 90.3802,
    parentArea: "Dhanmondi",
    aliases: ["popular", "popular hospital", "popular dhanmondi", "popular diagnostic"],
  },
  {
    name: "Labaid Specialized Hospital",
    category: "HOSPITAL",
    lat: 23.7450,
    lng: 90.3780,
    parentArea: "Dhanmondi",
    aliases: ["labaid", "labaid cardiac", "labaid dhanmondi"],
  },
  {
    name: "National Heart Foundation",
    category: "HOSPITAL",
    lat: 23.8055,
    lng: 90.3582,
    parentArea: "Mirpur 2",
    aliases: ["heart foundation", "national heart foundation", "nhf mirpur"],
  },
  {
    name: "Shaheed Suhrawardy Medical College Hospital",
    category: "HOSPITAL",
    lat: 23.7710,
    lng: 90.3700,
    parentArea: "Shyamoli",
    aliases: ["suhrawardy", "sohrawardi", "suhrawardy hospital", "shohrawardi"],
  },
  {
    name: "National Institute of Neurosciences & Hospital (NINS)",
    category: "HOSPITAL",
    lat: 23.7725,
    lng: 90.3695,
    parentArea: "Shyamoli",
    aliases: ["nins", "neuroscience hospital", "neuro science"],
  },
  {
    name: "Kurmitola General Hospital",
    category: "HOSPITAL",
    lat: 23.8250,
    lng: 90.4050,
    parentArea: "Nikunja",
    aliases: ["kurmitola", "kgh", "kurmitola hospital", "cantonment hospital"],
  },
  {
    name: "Asgar Ali Hospital",
    category: "HOSPITAL",
    lat: 23.7085,
    lng: 90.4280,
    parentArea: "Wari",
    aliases: ["asgar ali", "asgar ali hospital", "gendaria hospital"],
  },
  {
    name: "Ibn Sina Hospital Dhanmondi",
    category: "HOSPITAL",
    lat: 23.7470,
    lng: 90.3750,
    parentArea: "Dhanmondi",
    aliases: ["ibn sina", "ibn sina dhanmondi", "ibn sina medical"],
  },
  {
    name: "Ibn Sina Specialized Hospital Badda",
    category: "HOSPITAL",
    lat: 23.7790,
    lng: 90.4250,
    parentArea: "Badda",
    aliases: ["ibn sina badda", "ibn sina diagnostic badda"],
  },
  {
    name: "Central Hospital Limited",
    category: "HOSPITAL",
    lat: 23.7460,
    lng: 90.3860,
    parentArea: "Panthapath",
    aliases: ["central hospital", "central hospital green road"],
  },
  {
    name: "Holy Family Red Crescent Medical College Hospital",
    category: "HOSPITAL",
    lat: 23.7420,
    lng: 90.4045,
    parentArea: "Mogbazar",
    aliases: ["holy family", "red crescent hospital", "holy family mogbazar"],
  },
  {
    name: "Delta Hospital Mirpur",
    category: "HOSPITAL",
    lat: 23.8080,
    lng: 90.3610,
    parentArea: "Mirpur 10",
    aliases: ["delta hospital", "delta medical", "delta mirpur"],
  },
  {
    name: "Bangladesh Specialized Hospital",
    category: "HOSPITAL",
    lat: 23.7745,
    lng: 90.3615,
    parentArea: "Shyamoli",
    aliases: ["bangladesh specialized", "bsh shyamoli"],
  },
  {
    name: "AMZ Hospital Badda",
    category: "HOSPITAL",
    lat: 23.7820,
    lng: 90.4270,
    parentArea: "Badda",
    aliases: ["amz hospital", "amz badda", "uttara bank badda"],
  },
];

export const ALL_LOCATIONS = [...DHAKA_HOSPITALS, ...DHAKA_AREAS];

/**
 * Normalizes query string for fuzzy alias matching
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Searches the location and hospital index for autocomplete and selection.
 */
export function searchLocations(query: string, maxResults = 8): LocationEntry[] {
  if (!query || query.trim().length === 0) {
    return ALL_LOCATIONS.slice(0, maxResults);
  }

  const qNorm = normalize(query);
  const qWords = query.toLowerCase().trim().split(/\s+/);

  const scored = ALL_LOCATIONS.map((loc) => {
    let score = 0;
    const nameNorm = normalize(loc.name);

    // Exact match
    if (nameNorm === qNorm) score += 100;
    else if (nameNorm.startsWith(qNorm)) score += 50;
    else if (nameNorm.includes(qNorm)) score += 30;

    // Word match
    for (const w of qWords) {
      if (loc.name.toLowerCase().includes(w)) score += 15;
      if (loc.parentArea && loc.parentArea.toLowerCase().includes(w)) score += 10;
    }

    // Alias matches
    if (loc.aliases) {
      for (const alias of loc.aliases) {
        const aliasNorm = normalize(alias);
        if (aliasNorm === qNorm) score += 90;
        else if (aliasNorm.includes(qNorm)) score += 25;
      }
    }

    return { loc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.loc);
}

/**
 * Resolves exact coordinates from Hospital Name and Area/Zone.
 * Clinical / Dispatch Priority:
 * 1. If hospital name matches a verified hospital, use the hospital coordinates.
 * 2. If area matches a verified Dhaka area (e.g. Aftabnagar, Mirpur, Uttara), use that area coordinates.
 * 3. If raw address mentions any known zone, use that zone coordinates.
 * 4. Fallback to Central Dhaka (23.8103, 90.4125).
 */
export function resolveCoordinates(options: {
  hospitalName?: string | null;
  areaZone?: string | null;
  rawAddress?: string | null;
}): { lat: number; lng: number; label: string; area: string; isHospital: boolean } {
  const { hospitalName = "", areaZone = "", rawAddress = "" } = options;

  // 1. Check hospital name
  if (hospitalName && hospitalName.trim()) {
    const qNorm = normalize(hospitalName);
    const matchedHospital = DHAKA_HOSPITALS.find((h) => {
      if (normalize(h.name) === qNorm || normalize(h.name).includes(qNorm) || qNorm.includes(normalize(h.name))) {
        return true;
      }
      return h.aliases?.some((a) => qNorm.includes(normalize(a)) || normalize(a).includes(qNorm));
    });

    if (matchedHospital) {
      return {
        lat: matchedHospital.lat,
        lng: matchedHospital.lng,
        label: matchedHospital.name,
        area: matchedHospital.parentArea || areaZone || "Dhaka",
        isHospital: true,
      };
    }
  }

  // 2. Check area zone
  if (areaZone && areaZone.trim()) {
    const qNorm = normalize(areaZone);
    const matchedArea = DHAKA_AREAS.find((a) => {
      if (normalize(a.name) === qNorm || normalize(a.name).includes(qNorm) || qNorm.includes(normalize(a.name))) {
        return true;
      }
      return a.aliases?.some((al) => qNorm.includes(normalize(al)) || normalize(al).includes(qNorm));
    });

    if (matchedArea) {
      return {
        lat: matchedArea.lat,
        lng: matchedArea.lng,
        label: matchedArea.name,
        area: matchedArea.name,
        isHospital: false,
      };
    }
  }

  // 3. Check combined text in raw address
  const fullText = `${hospitalName} ${areaZone} ${rawAddress}`.toLowerCase();
  for (const loc of ALL_LOCATIONS) {
    if (fullText.includes(loc.name.toLowerCase())) {
      return {
        lat: loc.lat,
        lng: loc.lng,
        label: loc.name,
        area: loc.parentArea || loc.name,
        isHospital: loc.category === "HOSPITAL",
      };
    }
    if (loc.aliases) {
      for (const al of loc.aliases) {
        if (fullText.includes(al.toLowerCase())) {
          return {
            lat: loc.lat,
            lng: loc.lng,
            label: loc.name,
            area: loc.parentArea || loc.name,
            isHospital: loc.category === "HOSPITAL",
          };
        }
      }
    }
  }

  // 4. Fallback to Central Dhaka
  return {
    lat: 23.8103,
    lng: 90.4125,
    label: hospitalName || areaZone || "Dhaka City Center",
    area: areaZone || "Dhaka",
    isHospital: false,
  };
}

/**
 * Calculates Great-Circle distance in km using the standard Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
