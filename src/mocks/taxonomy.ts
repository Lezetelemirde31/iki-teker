import type {
  AttributeDef,
  Category,
  CategorySchema,
  LocalizedText,
  Make,
  Model,
  VehicleCategorySlug,
} from "@/types";

/** Terse helper for the large volume of trilingual taxonomy labels below. */
const lt = (az: string, en: string, ru: string): LocalizedText => ({ az, en, ru });

/* -------------------------------------------------------------------------- */
/*  Home categories — seven vehicle sections plus a dedicated rental entry      */
/* -------------------------------------------------------------------------- */

export const categories: Category[] = [
  { slug: "motorcycles", labelKey: "categories.motorcycles", icon: "Bike", kind: "vehicle", isEntryPoint: false },
  { slug: "scooters", labelKey: "categories.scooters", icon: "Scooter", kind: "vehicle", isEntryPoint: false },
  { slug: "electric", labelKey: "categories.electric", icon: "Zap", kind: "vehicle", isEntryPoint: false },
  { slug: "bicycles", labelKey: "categories.bicycles", icon: "Bicycle", kind: "vehicle", isEntryPoint: false },
  { slug: "parts", labelKey: "categories.parts", icon: "Wrench", kind: "goods", isEntryPoint: false },
  { slug: "gear", labelKey: "categories.gear", icon: "HardHat", kind: "goods", isEntryPoint: false },
  { slug: "services", labelKey: "categories.services", icon: "Hammer", kind: "service", isEntryPoint: true },
  { slug: "rental", labelKey: "categories.rental", icon: "KeyRound", kind: "rental", isEntryPoint: true },
];

/* -------------------------------------------------------------------------- */
/*  Makes                                                                      */
/* -------------------------------------------------------------------------- */

type MakeSeed = [name: string, country: string, categories: VehicleCategorySlug[], popular: boolean];

const makeSeeds: MakeSeed[] = [
  ["Honda", "Japan", ["motorcycles", "scooters"], true],
  ["Yamaha", "Japan", ["motorcycles", "scooters"], true],
  ["Kawasaki", "Japan", ["motorcycles"], true],
  ["Suzuki", "Japan", ["motorcycles", "scooters"], true],
  ["BMW", "Germany", ["motorcycles"], true],
  ["KTM", "Austria", ["motorcycles"], true],
  ["Ducati", "Italy", ["motorcycles"], true],
  ["Harley-Davidson", "USA", ["motorcycles"], false],
  ["Royal Enfield", "India", ["motorcycles"], true],
  ["Benelli", "Italy", ["motorcycles"], false],
  ["CFMoto", "China", ["motorcycles"], false],
  ["Bajaj", "India", ["motorcycles"], false],
  ["Vespa", "Italy", ["scooters"], true],
  ["Piaggio", "Italy", ["scooters"], false],
  ["SYM", "Taiwan", ["scooters"], false],
  ["Kymco", "Taiwan", ["scooters"], false],
  ["Segway-Ninebot", "China", ["electric"], true],
  ["Xiaomi", "China", ["electric"], true],
  ["Super Soco", "China", ["electric"], false],
  ["NIU", "China", ["electric"], true],
  ["Dualtron", "South Korea", ["electric"], false],
  ["Yadea", "China", ["electric"], false],
  ["Kaabo", "China", ["electric"], true],
  ["NAMI", "China", ["electric"], true],
  ["Apollo", "Canada", ["electric"], true],
  ["Inokim", "Israel", ["electric"], true],
  ["VSETT", "China", ["electric"], true],
  ["Teverun", "China", ["electric"], false],
  ["Mukuta", "China", ["electric"], false],
  ["Zero", "China", ["electric"], false],
  ["KuKirin", "China", ["electric"], true],
  ["Navee", "China", ["electric"], true],
  ["Pure Electric", "United Kingdom", ["electric"], false],
  ["Okai", "China", ["electric"], false],
  ["Unagi", "USA", ["electric"], false],
  ["E-TWOW", "South Korea", ["electric"], false],
  ["Inmotion", "China", ["electric"], false],
  ["Rovoron", "Russia", ["electric"], false],
  ["Sur-Ron", "China", ["electric"], true],
  ["Razor", "USA", ["electric"], false],
  ["Hiboy", "USA", ["electric"], false],
  ["Gotrax", "USA", ["electric"], false],
  ["TurboAnt", "USA", ["electric"], false],
  ["Fluid", "USA", ["electric"], false],
  ["Aovo", "China", ["electric"], false],
  ["iScooter", "China", ["electric"], false],
  ["Joyor", "Spain", ["electric"], false],
  ["Ausom", "China", ["electric"], false],
  ["Circooter", "China", ["electric"], false],
  ["Egret", "Germany", ["electric"], false],
  ["VMAX", "Switzerland", ["electric"], false],
  ["Smartgyro", "Spain", ["electric"], false],
  ["Trek", "USA", ["bicycles"], true],
  ["Giant", "Taiwan", ["bicycles"], true],
  ["Merida", "Taiwan", ["bicycles"], true],
  ["Specialized", "USA", ["bicycles"], true],
  ["Cube", "Germany", ["bicycles"], false],
  ["Scott", "Switzerland", ["bicycles"], false],
  ["Cannondale", "USA", ["bicycles"], false],
  ["Author", "Czechia", ["bicycles"], false],
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const makes: Make[] = makeSeeds.map(([name, country, cats, popular]) => ({
  id: `make-${slugify(name)}`,
  name,
  slug: slugify(name),
  categories: cats,
  country,
  popular,
}));

/* -------------------------------------------------------------------------- */
/*  Models                                                                     */
/* -------------------------------------------------------------------------- */

type ModelSeed = [
  makeName: string,
  name: string,
  category: VehicleCategorySlug,
  from: number,
  to: number,
  bodyType?: string,
];

const modelSeeds: ModelSeed[] = [
  // Honda
  ["Honda", "CB650R", "motorcycles", 2019, 2026, "naked"],
  ["Honda", "CBR650R", "motorcycles", 2019, 2026, "sport"],
  ["Honda", "Rebel 500", "motorcycles", 2017, 2026, "cruiser"],
  ["Honda", "CB500X", "motorcycles", 2013, 2026, "adventure"],
  ["Honda", "CRF1100L Africa Twin", "motorcycles", 2020, 2026, "adventure"],
  ["Honda", "Shadow 750", "motorcycles", 2010, 2022, "cruiser"],
  ["Honda", "PCX 125", "scooters", 2014, 2026],
  ["Honda", "SH150i", "scooters", 2013, 2026],
  ["Honda", "Forza 350", "scooters", 2021, 2026],
  // Yamaha
  ["Yamaha", "MT-07", "motorcycles", 2014, 2026, "naked"],
  ["Yamaha", "MT-09", "motorcycles", 2014, 2026, "naked"],
  ["Yamaha", "YZF-R3", "motorcycles", 2015, 2026, "sport"],
  ["Yamaha", "XSR700", "motorcycles", 2016, 2026, "scrambler"],
  ["Yamaha", "Tracer 700", "motorcycles", 2016, 2026, "touring"],
  ["Yamaha", "NMAX 155", "scooters", 2016, 2026],
  ["Yamaha", "XMAX 300", "scooters", 2017, 2026],
  // Kawasaki
  ["Kawasaki", "Z900", "motorcycles", 2017, 2026, "naked"],
  ["Kawasaki", "Z650", "motorcycles", 2017, 2026, "naked"],
  ["Kawasaki", "Ninja 400", "motorcycles", 2018, 2026, "sport"],
  ["Kawasaki", "Versys 650", "motorcycles", 2010, 2026, "adventure"],
  ["Kawasaki", "Vulcan S", "motorcycles", 2015, 2026, "cruiser"],
  // Suzuki
  ["Suzuki", "GSX-S750", "motorcycles", 2015, 2022, "naked"],
  ["Suzuki", "V-Strom 650", "motorcycles", 2012, 2026, "adventure"],
  ["Suzuki", "SV650", "motorcycles", 2016, 2026, "naked"],
  ["Suzuki", "GSX-R600", "motorcycles", 2011, 2020, "sport"],
  ["Suzuki", "Burgman 400", "scooters", 2013, 2026],
  // BMW
  ["BMW", "R 1250 GS", "motorcycles", 2019, 2026, "adventure"],
  ["BMW", "F 850 GS", "motorcycles", 2018, 2026, "adventure"],
  ["BMW", "S 1000 RR", "motorcycles", 2012, 2026, "sport"],
  ["BMW", "G 310 R", "motorcycles", 2017, 2026, "naked"],
  // KTM
  ["KTM", "390 Duke", "motorcycles", 2013, 2026, "naked"],
  ["KTM", "790 Duke", "motorcycles", 2018, 2023, "naked"],
  ["KTM", "390 Adventure", "motorcycles", 2020, 2026, "adventure"],
  // Ducati
  ["Ducati", "Monster 821", "motorcycles", 2014, 2020, "naked"],
  ["Ducati", "Scrambler Icon", "motorcycles", 2015, 2026, "scrambler"],
  ["Ducati", "Panigale V2", "motorcycles", 2020, 2026, "sport"],
  // Harley-Davidson
  ["Harley-Davidson", "Iron 883", "motorcycles", 2010, 2022, "cruiser"],
  ["Harley-Davidson", "Street 750", "motorcycles", 2014, 2021, "cruiser"],
  // Royal Enfield
  ["Royal Enfield", "Classic 350", "motorcycles", 2010, 2026, "cruiser"],
  ["Royal Enfield", "Himalayan", "motorcycles", 2016, 2026, "adventure"],
  ["Royal Enfield", "Continental GT 650", "motorcycles", 2019, 2026, "cafe"],
  // Benelli / CFMoto / Bajaj
  ["Benelli", "TRK 502", "motorcycles", 2017, 2026, "adventure"],
  ["Benelli", "Leoncino 500", "motorcycles", 2018, 2026, "scrambler"],
  ["CFMoto", "650NK", "motorcycles", 2013, 2026, "naked"],
  ["CFMoto", "700CL-X", "motorcycles", 2021, 2026, "scrambler"],
  ["Bajaj", "Pulsar NS200", "motorcycles", 2012, 2026, "naked"],
  ["Bajaj", "Dominar 400", "motorcycles", 2017, 2026, "touring"],
  // Vespa / Piaggio / SYM / Kymco
  ["Vespa", "Primavera 150", "scooters", 2014, 2026],
  ["Vespa", "GTS 300", "scooters", 2010, 2026],
  ["Vespa", "Sprint 150", "scooters", 2014, 2026],
  ["Piaggio", "Liberty 125", "scooters", 2015, 2026],
  ["Piaggio", "Beverly 300", "scooters", 2011, 2026],
  ["SYM", "Jet 14", "scooters", 2018, 2026],
  ["Kymco", "Agility 125", "scooters", 2012, 2026],
  ["Honda", "Dio 110", "scooters", 2015, 2026],
  ["Honda", "Vision 110", "scooters", 2015, 2026],
  ["Honda", "ADV 350", "scooters", 2015, 2026],
  ["Honda", "Forza 125", "scooters", 2015, 2026],
  ["Honda", "SH125i", "scooters", 2015, 2026],
  ["Yamaha", "Aerox 155", "scooters", 2015, 2026],
  ["Yamaha", "Tricity 155", "scooters", 2015, 2026],
  ["Yamaha", "TMAX 560", "scooters", 2015, 2026],
  ["Yamaha", "Jog 50", "scooters", 2015, 2026],
  ["Suzuki", "Address 110", "scooters", 2015, 2026],
  ["Suzuki", "Burgman 125", "scooters", 2015, 2026],
  ["Suzuki", "Avenis 125", "scooters", 2015, 2026],
  ["Vespa", "LX 125", "scooters", 2015, 2026],
  ["Vespa", "Elettrica", "scooters", 2015, 2026],
  ["Vespa", "GTV 300", "scooters", 2015, 2026],
  ["Vespa", "Primavera 125", "scooters", 2015, 2026],
  ["Piaggio", "Medley 125", "scooters", 2015, 2026],
  ["Piaggio", "Zip 50", "scooters", 2015, 2026],
  ["Piaggio", "Vespa Sprint 50", "scooters", 2015, 2026],
  ["SYM", "Symphony 125", "scooters", 2015, 2026],
  ["SYM", "Cruisym 300", "scooters", 2015, 2026],
  ["SYM", "Orbit III 125", "scooters", 2015, 2026],
  ["Kymco", "Like 125", "scooters", 2015, 2026],
  ["Kymco", "People S 125", "scooters", 2015, 2026],
  ["Kymco", "Downtown 350", "scooters", 2015, 2026],
  ["Kymco", "Super 8", "scooters", 2015, 2026],
  ["Honda", "Digər model", "scooters", 2010, 2026],
  ["Yamaha", "Digər model", "scooters", 2010, 2026],
  ["Suzuki", "Digər model", "scooters", 2010, 2026],
  ["Vespa", "Digər model", "scooters", 2010, 2026],
  ["Piaggio", "Digər model", "scooters", 2010, 2026],
  ["SYM", "Digər model", "scooters", 2010, 2026],
  ["Kymco", "Digər model", "scooters", 2010, 2026],
  // Electric
  ["Segway-Ninebot", "F40", "electric", 2021, 2026],
  ["Segway-Ninebot", "Max G30", "electric", 2019, 2026],
  ["Segway-Ninebot", "GT2", "electric", 2023, 2026],
  ["Xiaomi", "Scooter 4 Pro", "electric", 2022, 2026],
  ["Xiaomi", "Mi Electric Scooter 3", "electric", 2021, 2025],
  ["Super Soco", "TC Max", "electric", 2019, 2026],
  ["Super Soco", "CPx", "electric", 2020, 2026],
  ["NIU", "NQi GTS", "electric", 2019, 2026],
  ["NIU", "MQi+ Sport", "electric", 2019, 2026],
  ["Dualtron", "Thunder 3", "electric", 2022, 2026],
  ["Yadea", "G5", "electric", 2019, 2025],
  // Kaabo
  ["Kaabo", "Mantis 10", "electric", 2018, 2026],
  ["Kaabo", "Mantis King GT", "electric", 2018, 2026],
  ["Kaabo", "Wolf Warrior 11", "electric", 2018, 2026],
  ["Kaabo", "Wolf King GT", "electric", 2018, 2026],
  ["Kaabo", "Wolf King GTR", "electric", 2018, 2026],
  ["Kaabo", "Skywalker 10", "electric", 2018, 2026],
  // NAMI
  ["NAMI", "Burn-E 2 Max", "electric", 2018, 2026],
  ["NAMI", "Klima", "electric", 2018, 2026],
  ["NAMI", "Blast", "electric", 2018, 2026],
  // Apollo
  ["Apollo", "City", "electric", 2018, 2026],
  ["Apollo", "Explore", "electric", 2018, 2026],
  ["Apollo", "Ghost", "electric", 2018, 2026],
  ["Apollo", "Phantom", "electric", 2018, 2026],
  ["Apollo", "Pro", "electric", 2018, 2026],
  ["Apollo", "Go", "electric", 2018, 2026],
  // Inokim
  ["Inokim", "OX", "electric", 2018, 2026],
  ["Inokim", "OXO", "electric", 2018, 2026],
  ["Inokim", "Quick 4", "electric", 2018, 2026],
  ["Inokim", "Light 3", "electric", 2018, 2026],
  // VSETT
  ["VSETT", "8", "electric", 2018, 2026],
  ["VSETT", "9+", "electric", 2018, 2026],
  ["VSETT", "10+", "electric", 2018, 2026],
  ["VSETT", "11+", "electric", 2018, 2026],
  // Teverun
  ["Teverun", "Fighter 11", "electric", 2018, 2026],
  ["Teverun", "Blade Mini", "electric", 2018, 2026],
  ["Teverun", "Blade GT", "electric", 2018, 2026],
  // Mukuta
  ["Mukuta", "Mukuta 9", "electric", 2018, 2026],
  ["Mukuta", "Mukuta 10", "electric", 2018, 2026],
  ["Mukuta", "Mukuta 12", "electric", 2018, 2026],
  // Zero
  ["Zero", "Zero 8", "electric", 2018, 2026],
  ["Zero", "Zero 9", "electric", 2018, 2026],
  ["Zero", "Zero 10X", "electric", 2018, 2026],
  ["Zero", "Zero 11X", "electric", 2018, 2026],
  // KuKirin
  ["KuKirin", "M4 Pro", "electric", 2018, 2026],
  ["KuKirin", "G2 Pro", "electric", 2018, 2026],
  ["KuKirin", "G4 Pro", "electric", 2018, 2026],
  ["KuKirin", "S1 Pro", "electric", 2018, 2026],
  // Navee
  ["Navee", "N40", "electric", 2018, 2026],
  ["Navee", "N65", "electric", 2018, 2026],
  ["Navee", "S65", "electric", 2018, 2026],
  ["Navee", "GT3", "electric", 2018, 2026],
  // Pure Electric
  ["Pure Electric", "Air 3", "electric", 2018, 2026],
  ["Pure Electric", "Air Pro", "electric", 2018, 2026],
  ["Pure Electric", "Advance", "electric", 2018, 2026],
  // Okai
  ["Okai", "Neon", "electric", 2018, 2026],
  ["Okai", "ES400", "electric", 2018, 2026],
  ["Okai", "Beetle", "electric", 2018, 2026],
  // Unagi
  ["Unagi", "Model One", "electric", 2018, 2026],
  ["Unagi", "Model Eleven", "electric", 2018, 2026],
  // E-TWOW
  ["E-TWOW", "GT SE", "electric", 2018, 2026],
  ["E-TWOW", "Booster GT", "electric", 2018, 2026],
  // Inmotion
  ["Inmotion", "S1", "electric", 2018, 2026],
  ["Inmotion", "Climber", "electric", 2018, 2026],
  ["Inmotion", "RS", "electric", 2018, 2026],
  // Rovoron
  ["Rovoron", "Hunter", "electric", 2018, 2026],
  ["Rovoron", "Rocket", "electric", 2018, 2026],
  // Sur-Ron
  ["Sur-Ron", "Light Bee X", "electric", 2018, 2026],
  ["Sur-Ron", "Storm Bee", "electric", 2018, 2026],
  ["Sur-Ron", "Ultra Bee", "electric", 2018, 2026],
  // Razor
  ["Razor", "E300", "electric", 2018, 2026],
  ["Razor", "E Prime", "electric", 2018, 2026],
  ["Razor", "EcoSmart", "electric", 2018, 2026],
  // Hiboy
  ["Hiboy", "S2", "electric", 2018, 2026],
  ["Hiboy", "S2 Pro", "electric", 2018, 2026],
  ["Hiboy", "Titan Pro", "electric", 2018, 2026],
  ["Hiboy", "KS4 Pro", "electric", 2018, 2026],
  // Gotrax
  ["Gotrax", "GXL V2", "electric", 2018, 2026],
  ["Gotrax", "G4", "electric", 2018, 2026],
  ["Gotrax", "G6", "electric", 2018, 2026],
  ["Gotrax", "Apex", "electric", 2018, 2026],
  // TurboAnt
  ["TurboAnt", "X7 Pro", "electric", 2018, 2026],
  ["TurboAnt", "M10", "electric", 2018, 2026],
  ["TurboAnt", "V8", "electric", 2018, 2026],
  // Fluid
  ["Fluid", "Horizon", "electric", 2018, 2026],
  ["Fluid", "Mosquito", "electric", 2018, 2026],
  ["Fluid", "Rapid", "electric", 2018, 2026],
  // Aovo
  ["Aovo", "Pro M365", "electric", 2018, 2026],
  ["Aovo", "X9 Plus", "electric", 2018, 2026],
  // iScooter
  ["iScooter", "i9", "electric", 2018, 2026],
  ["iScooter", "i10", "electric", 2018, 2026],
  ["iScooter", "iX4", "electric", 2018, 2026],
  ["iScooter", "iX5", "electric", 2018, 2026],
  // Joyor
  ["Joyor", "S5", "electric", 2018, 2026],
  ["Joyor", "S10", "electric", 2018, 2026],
  ["Joyor", "Y8-S", "electric", 2018, 2026],
  ["Joyor", "X5S", "electric", 2018, 2026],
  // Ausom
  ["Ausom", "Gallop", "electric", 2018, 2026],
  ["Ausom", "Leopard", "electric", 2018, 2026],
  // Circooter
  ["Circooter", "Raider", "electric", 2018, 2026],
  ["Circooter", "Mate", "electric", 2018, 2026],
  ["Circooter", "R3", "electric", 2018, 2026],
  // Egret
  ["Egret", "Pro", "electric", 2018, 2026],
  ["Egret", "One", "electric", 2018, 2026],
  ["Egret", "X", "electric", 2018, 2026],
  // VMAX
  ["VMAX", "VX2", "electric", 2018, 2026],
  ["VMAX", "VX5", "electric", 2018, 2026],
  ["VMAX", "R5", "electric", 2018, 2026],
  // Smartgyro
  ["Smartgyro", "Rockway", "electric", 2018, 2026],
  ["Smartgyro", "Speedway", "electric", 2018, 2026],
  ["Smartgyro", "Crossover", "electric", 2018, 2026],
  // Xiaomi
  ["Xiaomi", "Scooter 5 Pro", "electric", 2018, 2026],
  ["Xiaomi", "Scooter 4 Ultra", "electric", 2018, 2026],
  ["Xiaomi", "Mi Scooter Pro 2", "electric", 2018, 2026],
  ["Xiaomi", "Mi Scooter 1S", "electric", 2018, 2026],
  // Segway-Ninebot
  ["Segway-Ninebot", "Max G2", "electric", 2018, 2026],
  ["Segway-Ninebot", "F2 Plus", "electric", 2018, 2026],
  ["Segway-Ninebot", "E2 Plus", "electric", 2018, 2026],
  ["Segway-Ninebot", "P100S", "electric", 2018, 2026],
  ["Segway-Ninebot", "ZT3 Pro", "electric", 2018, 2026],
  // Dualtron
  ["Dualtron", "Thunder 2", "electric", 2018, 2026],
  ["Dualtron", "Victor", "electric", 2018, 2026],
  ["Dualtron", "Storm", "electric", 2018, 2026],
  ["Dualtron", "Mini Special", "electric", 2018, 2026],
  // NIU
  ["NIU", "KQi3 Pro", "electric", 2018, 2026],
  ["NIU", "KQi2 Pro", "electric", 2018, 2026],
  ["NIU", "KQi Air", "electric", 2018, 2026],
  // Super Soco
  ["Super Soco", "CUx", "electric", 2018, 2026],
  ["Super Soco", "TS Street Hunter", "electric", 2018, 2026],
  // Yadea
  ["Yadea", "KS5 Pro", "electric", 2018, 2026],
  ["Yadea", "ElitePrime", "electric", 2018, 2026],
  ["Kaabo", "Digər model", "electric", 2015, 2026],
  ["NAMI", "Digər model", "electric", 2015, 2026],
  ["Apollo", "Digər model", "electric", 2015, 2026],
  ["Inokim", "Digər model", "electric", 2015, 2026],
  ["VSETT", "Digər model", "electric", 2015, 2026],
  ["Teverun", "Digər model", "electric", 2015, 2026],
  ["Mukuta", "Digər model", "electric", 2015, 2026],
  ["Zero", "Digər model", "electric", 2015, 2026],
  ["KuKirin", "Digər model", "electric", 2015, 2026],
  ["Navee", "Digər model", "electric", 2015, 2026],
  ["Pure Electric", "Digər model", "electric", 2015, 2026],
  ["Okai", "Digər model", "electric", 2015, 2026],
  ["Unagi", "Digər model", "electric", 2015, 2026],
  ["E-TWOW", "Digər model", "electric", 2015, 2026],
  ["Inmotion", "Digər model", "electric", 2015, 2026],
  ["Rovoron", "Digər model", "electric", 2015, 2026],
  ["Sur-Ron", "Digər model", "electric", 2015, 2026],
  ["Razor", "Digər model", "electric", 2015, 2026],
  ["Hiboy", "Digər model", "electric", 2015, 2026],
  ["Gotrax", "Digər model", "electric", 2015, 2026],
  ["TurboAnt", "Digər model", "electric", 2015, 2026],
  ["Fluid", "Digər model", "electric", 2015, 2026],
  ["Aovo", "Digər model", "electric", 2015, 2026],
  ["iScooter", "Digər model", "electric", 2015, 2026],
  ["Joyor", "Digər model", "electric", 2015, 2026],
  ["Ausom", "Digər model", "electric", 2015, 2026],
  ["Circooter", "Digər model", "electric", 2015, 2026],
  ["Egret", "Digər model", "electric", 2015, 2026],
  ["VMAX", "Digər model", "electric", 2015, 2026],
  ["Smartgyro", "Digər model", "electric", 2015, 2026],
  ["Xiaomi", "Digər model", "electric", 2015, 2026],
  ["Segway-Ninebot", "Digər model", "electric", 2015, 2026],
  ["Dualtron", "Digər model", "electric", 2015, 2026],
  ["NIU", "Digər model", "electric", 2015, 2026],
  ["Super Soco", "Digər model", "electric", 2015, 2026],
  ["Yadea", "Digər model", "electric", 2015, 2026],
  // Bicycles
  ["Trek", "Marlin 7", "bicycles", 2018, 2026, "mtb"],
  ["Trek", "FX 3 Disc", "bicycles", 2019, 2026, "city"],
  ["Trek", "Domane AL 3", "bicycles", 2020, 2026, "road"],
  ["Giant", "Talon 3", "bicycles", 2018, 2026, "mtb"],
  ["Giant", "Escape 3", "bicycles", 2017, 2026, "city"],
  ["Giant", "TCR Advanced", "bicycles", 2018, 2026, "road"],
  ["Merida", "Big Nine 100", "bicycles", 2018, 2026, "mtb"],
  ["Merida", "Scultura 100", "bicycles", 2018, 2026, "road"],
  ["Specialized", "Rockhopper", "bicycles", 2016, 2026, "mtb"],
  ["Specialized", "Sirrus X", "bicycles", 2019, 2026, "city"],
  ["Cube", "Aim Pro", "bicycles", 2018, 2026, "mtb"],
  ["Cube", "Attain", "bicycles", 2018, 2026, "road"],
  ["Scott", "Aspect 950", "bicycles", 2017, 2026, "mtb"],
  ["Cannondale", "Trail 8", "bicycles", 2019, 2026, "mtb"],
  ["Author", "Solution", "bicycles", 2016, 2026, "city"],
];

export const models: Model[] = modelSeeds.map(([makeName, name, category, from, to, bodyType]) => ({
  id: `model-${slugify(makeName)}-${slugify(name)}`,
  makeId: `make-${slugify(makeName)}`,
  name,
  category,
  years: [from, to],
  bodyType,
}));

export const makeById = new Map(makes.map((make) => [make.id, make]));
export const modelById = new Map(models.map((model) => [model.id, model]));

export function makesFor(category: VehicleCategorySlug) {
  return makes.filter((make) => make.categories.includes(category));
}

export function modelsFor(makeId: string, category?: VehicleCategorySlug) {
  return models.filter(
    (model) => model.makeId === makeId && (!category || model.category === category),
  );
}

/* -------------------------------------------------------------------------- */
/*  Category attribute schemas                                                 */
/* -------------------------------------------------------------------------- */

const KM = lt("km", "km", "км");
const CM3 = lt("sm³", "cm³", "см³");

const conditionRow: AttributeDef = {
  key: "bodyType",
  label: lt("Tip", "Type", "Тип"),
  type: "select",
  filterable: true,
  required: false,
  inSpecTable: true,
  options: [
    { value: "naked", label: lt("Neyked", "Naked", "Нейкед") },
    { value: "sport", label: lt("Sport", "Sport", "Спорт") },
    { value: "cruiser", label: lt("Kruzer", "Cruiser", "Круизер") },
    { value: "touring", label: lt("Turizm", "Touring", "Турер") },
    { value: "adventure", label: lt("Endüro / Adventure", "Adventure", "Эндуро / Адвенчер") },
    { value: "scrambler", label: lt("Skrembler", "Scrambler", "Скремблер") },
    { value: "cafe", label: lt("Cafe racer", "Cafe racer", "Кафе-рейсер") },
  ],
};

const mileageRow: AttributeDef = {
  key: "mileage",
  label: lt("Yürüş", "Mileage", "Пробег"),
  type: "number",
  unit: KM,
  min: 0,
  max: 200_000,
  step: 500,
  filterable: true,
  required: true,
  inSpecTable: true,
  inResultChips: true,
};

const engineRow: AttributeDef = {
  key: "engineCc",
  label: lt("Mühərrikin həcmi", "Engine displacement", "Объём двигателя"),
  type: "number",
  unit: CM3,
  min: 49,
  max: 1800,
  step: 1,
  filterable: true,
  required: true,
  inSpecTable: true,
  inResultChips: true,
  buckets: [
    { value: "0-125", label: lt("125-ə qədər", "up to 125", "до 125"), max: 125 },
    { value: "125-400", label: lt("125–400", "125–400", "125–400"), min: 125, max: 400 },
    { value: "400-750", label: lt("400–750", "400–750", "400–750"), min: 400, max: 750 },
    { value: "750-plus", label: lt("750+", "750+", "750+"), min: 750 },
  ],
};

const licenceRow: AttributeDef = {
  key: "licence",
  label: lt("Sürücülük vəsiqəsi", "Licence", "Права"),
  type: "select",
  filterable: false,
  required: true,
  inSpecTable: true,
  options: [
    { value: "A", label: lt("Kat. A", "Cat. A", "Кат. A") },
    { value: "A1", label: lt("Kat. A1", "Cat. A1", "Кат. A1") },
    { value: "B", label: lt("Kat. B", "Cat. B", "Кат. B") },
    { value: "none", label: lt("Tələb olunmur", "Not required", "Не требуются") },
  ],
};

const colourRow: AttributeDef = {
  key: "colour",
  label: lt("Rəng", "Colour", "Цвет"),
  type: "select",
  filterable: false,
  required: false,
  inSpecTable: true,
  options: [
    { value: "black", label: lt("Qara", "Black", "Чёрный") },
    { value: "white", label: lt("Ağ", "White", "Белый") },
    { value: "red", label: lt("Qırmızı", "Red", "Красный") },
    { value: "blue", label: lt("Mavi", "Blue", "Синий") },
    { value: "green", label: lt("Yaşıl", "Green", "Зелёный") },
    { value: "grey", label: lt("Boz", "Grey", "Серый") },
    { value: "yellow", label: lt("Sarı", "Yellow", "Жёлтый") },
    { value: "orange", label: lt("Narıncı", "Orange", "Оранжевый") },
  ],
};

/**
 * Each category exposes its own field set. An electric scooter is described by
 * range and battery health; a bicycle by frame size and discipline. The same
 * definitions drive the filter sheet, the create-listing form and the spec
 * table, so the three can never drift apart.
 */
export const categorySchemas: CategorySchema = {
  motorcycles: [engineRow, mileageRow, conditionRow, licenceRow, colourRow],

  scooters: [
    { ...engineRow, max: 400, buckets: engineRow.buckets?.slice(0, 3) },
    mileageRow,
    licenceRow,
    colourRow,
    {
      key: "storage",
      label: lt("Baqaj yeri", "Under-seat storage", "Багажное отделение"),
      type: "boolean",
      filterable: true,
      required: false,
      inSpecTable: true,
    },
  ],

  electric: [
    {
      key: "range",
      label: lt("Yürüş məsafəsi", "Range", "Запас хода"),
      type: "number",
      unit: KM,
      min: 10,
      max: 200,
      step: 5,
      filterable: true,
      required: true,
      inSpecTable: true,
      inResultChips: true,
      buckets: [
        { value: "0-30", label: lt("30-a qədər", "up to 30", "до 30"), max: 30 },
        { value: "30-60", label: lt("30–60", "30–60", "30–60"), min: 30, max: 60 },
        { value: "60-plus", label: lt("60+", "60+", "60+"), min: 60 },
      ],
    },
    {
      key: "batteryHealth",
      label: lt("Batareyanın vəziyyəti", "Battery health", "Состояние батареи"),
      type: "number",
      unit: lt("%", "%", "%"),
      min: 50,
      max: 100,
      step: 1,
      filterable: true,
      required: true,
      inSpecTable: true,
    },
    {
      key: "motorPower",
      label: lt("Mühərrikin gücü", "Motor power", "Мощность мотора"),
      type: "number",
      unit: lt("Vt", "W", "Вт"),
      min: 250,
      max: 6000,
      step: 50,
      filterable: true,
      required: true,
      inSpecTable: true,
      inResultChips: true,
    },
    {
      key: "topSpeed",
      label: lt("Maksimal sürət", "Top speed", "Максимальная скорость"),
      type: "number",
      unit: lt("km/s", "km/h", "км/ч"),
      min: 15,
      max: 120,
      step: 1,
      filterable: false,
      required: false,
      inSpecTable: true,
    },
    { ...mileageRow, max: 30_000, step: 100, required: false },
    {
      key: "removableBattery",
      label: lt("Çıxarılan batareya", "Removable battery", "Съёмная батарея"),
      type: "boolean",
      filterable: true,
      required: false,
      inSpecTable: true,
    },
  ],

  bicycles: [
    {
      key: "frameSize",
      label: lt("Ram ölçüsü", "Frame size", "Размер рамы"),
      type: "select",
      filterable: true,
      required: true,
      inSpecTable: true,
      inResultChips: true,
      options: [
        { value: "xs", label: lt("XS (13–14\")", "XS (13–14\")", "XS (13–14\")") },
        { value: "s", label: lt("S (15–16\")", "S (15–16\")", "S (15–16\")") },
        { value: "m", label: lt("M (17–18\")", "M (17–18\")", "M (17–18\")") },
        { value: "l", label: lt("L (19–20\")", "L (19–20\")", "L (19–20\")") },
        { value: "xl", label: lt("XL (21\"+)", "XL (21\"+)", "XL (21\"+)") },
      ],
    },
    {
      key: "discipline",
      label: lt("Növ", "Discipline", "Тип"),
      type: "select",
      filterable: true,
      required: true,
      inSpecTable: true,
      options: [
        { value: "mtb", label: lt("Dağ velosipedi", "Mountain", "Горный") },
        { value: "road", label: lt("Şosse", "Road", "Шоссейный") },
        { value: "gravel", label: lt("Gravel", "Gravel", "Гравийный") },
        { value: "city", label: lt("Şəhər", "City", "Городской") },
        { value: "folding", label: lt("Qatlanan", "Folding", "Складной") },
        { value: "kids", label: lt("Uşaq", "Kids", "Детский") },
      ],
    },
    {
      key: "frameMaterial",
      label: lt("Ram materialı", "Frame material", "Материал рамы"),
      type: "select",
      filterable: true,
      required: false,
      inSpecTable: true,
      options: [
        { value: "aluminium", label: lt("Alüminium", "Aluminium", "Алюминий") },
        { value: "carbon", label: lt("Karbon", "Carbon", "Карбон") },
        { value: "steel", label: lt("Polad", "Steel", "Сталь") },
      ],
    },
    {
      key: "wheelSize",
      label: lt("Təkər ölçüsü", "Wheel size", "Размер колёс"),
      type: "select",
      filterable: false,
      required: false,
      inSpecTable: true,
      options: [
        { value: "20", label: lt("20\"", "20\"", "20\"") },
        { value: "26", label: lt("26\"", "26\"", "26\"") },
        { value: "27.5", label: lt("27.5\"", "27.5\"", "27.5\"") },
        { value: "29", label: lt("29\"", "29\"", "29\"") },
        { value: "700c", label: lt("700c", "700c", "700c") },
      ],
    },
    {
      key: "gears",
      label: lt("Sürət sayı", "Gears", "Количество скоростей"),
      type: "number",
      min: 1,
      max: 33,
      step: 1,
      filterable: false,
      required: false,
      inSpecTable: true,
    },
    {
      key: "suspension",
      label: lt("Amortizasiya", "Suspension", "Амортизация"),
      type: "select",
      filterable: false,
      required: false,
      inSpecTable: true,
      options: [
        { value: "rigid", label: lt("Yoxdur", "Rigid", "Без амортизации") },
        { value: "hardtail", label: lt("Ön amortizator", "Hardtail", "Хардтейл") },
        { value: "full", label: lt("Tam amortizasiya", "Full suspension", "Двухподвес") },
      ],
    },
  ],

  parts: [
    {
      key: "oem",
      label: lt("Orijinal (OEM)", "Genuine (OEM)", "Оригинал (OEM)"),
      type: "boolean",
      filterable: true,
      required: false,
      inSpecTable: true,
    },
    {
      key: "warrantyMonths",
      label: lt("Zəmanət", "Warranty", "Гарантия"),
      type: "number",
      unit: lt("ay", "months", "мес"),
      min: 0,
      max: 36,
      step: 1,
      filterable: false,
      required: false,
      inSpecTable: true,
    },
  ],

  gear: [
    {
      key: "size",
      label: lt("Ölçü", "Size", "Размер"),
      type: "select",
      filterable: true,
      required: true,
      inSpecTable: true,
      inResultChips: true,
      options: ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({
        value: size.toLowerCase(),
        label: lt(size, size, size),
      })),
    },
    {
      key: "certification",
      label: lt("Sertifikat", "Certification", "Сертификация"),
      type: "select",
      filterable: true,
      required: false,
      inSpecTable: true,
      options: [
        { value: "ece2206", label: lt("ECE 22.06", "ECE 22.06", "ECE 22.06") },
        { value: "ece2205", label: lt("ECE 22.05", "ECE 22.05", "ECE 22.05") },
        { value: "dot", label: lt("DOT", "DOT", "DOT") },
        { value: "ce", label: lt("CE", "CE", "CE") },
      ],
    },
    colourRow,
  ],
};

export function schemaFor(category: keyof CategorySchema) {
  return categorySchemas[category] ?? [];
}

export function filterableAttributes(category: keyof CategorySchema) {
  return schemaFor(category).filter((attribute) => attribute.filterable);
}

export function specAttributes(category: keyof CategorySchema) {
  return schemaFor(category).filter((attribute) => attribute.inSpecTable);
}

/* -------------------------------------------------------------------------- */
/*  Shared option labels used outside the schemas                              */
/* -------------------------------------------------------------------------- */

export const conditionLabels: Record<"new" | "used", LocalizedText> = {
  new: lt("Yeni", "New", "Новый"),
  used: lt("İşlənmiş", "Used", "Б/у"),
};

export const sortLabels = {
  newest: lt("Əvvəlcə yenilər", "Newest first", "Сначала новые"),
  priceAsc: lt("Əvvəlcə ucuz", "Cheapest first", "Сначала дешёвые"),
  priceDesc: lt("Əvvəlcə baha", "Most expensive first", "Сначала дорогие"),
  mileageAsc: lt("Yürüşə görə", "Lowest mileage", "По пробегу"),
  yearDesc: lt("Əvvəlcə yeni il", "Newest year", "Сначала новее"),
  nearest: lt("Yaxınlıqda", "Nearest", "Ближайшие"),
} satisfies Record<string, LocalizedText>;
