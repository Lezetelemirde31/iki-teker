import { daysAgo, minutesAgo } from "@/lib/demo-clock";
import type {
  ArtTone,
  AttributeValues,
  Compatibility,
  Condition,
  GearType,
  ISODate,
  ListingStatus,
  LocalizedText,
  Part,
  PartType,
  Photo,
} from "@/types";

function makePhotos(seed: string, count: number, tone: ArtTone, alt: string): Photo[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${seed}-p${index + 1}`,
    seed: `${seed}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
  }));
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Compatibility shorthand — the fitment data the parts search runs on. */
function fits(
  make: string,
  models: string[],
  yearFrom?: number,
  yearTo?: number,
): Compatibility {
  return {
    makeId: `make-${slugify(make)}`,
    makeName: make,
    modelIds: models.map((model) => `model-${slugify(make)}-${slugify(model)}`),
    modelNames: models,
    yearFrom,
    yearTo,
  };
}

type PartSeed = {
  id: string;
  category: "parts" | "gear";
  partType: PartType | GearType;
  brand: string;
  title: string;
  localizedTitle: LocalizedText;
  price: number;
  negotiable?: boolean;
  condition?: Condition;
  partNumber?: string;
  stock: number;
  delivery?: boolean;
  sellerId: string;
  cityId: string;
  districtId: string;
  tone: ArtTone;
  photoCount: number;
  attributes: AttributeValues;
  compatibility: Compatibility[];
  description: LocalizedText;
  publishedAt: string;
  views: number;
  contacts: number;
  favorites: number;
  vip?: boolean;
  vipUntil?: ISODate;
  status?: ListingStatus;
};

function build(seed: PartSeed): Part {
  return {
    kind: "part",
    id: seed.id,
    slug: `${slugify(seed.title)}-${seed.id.slice(-4)}`,
    title: seed.title,
    localizedTitle: seed.localizedTitle,
    category: seed.category,
    partType: seed.partType,
    brand: seed.brand,
    partNumber: seed.partNumber,
    stock: seed.stock,
    price: seed.price,
    negotiable: seed.negotiable ?? false,
    condition: seed.condition ?? "new",
    description: seed.description,
    photos: makePhotos(seed.id, seed.photoCount, seed.tone, seed.title),
    attributes: seed.attributes,
    compatibility: seed.compatibility,
    sellerId: seed.sellerId,
    cityId: seed.cityId,
    districtId: seed.districtId,
    delivery: seed.delivery ?? false,
    status: seed.status ?? "active",
    promotion: { vip: seed.vip ?? false, vipUntil: seed.vipUntil },
    stats: { views: seed.views, contacts: seed.contacts, favorites: seed.favorites },
    publishedAt: seed.publishedAt,
  };
}

/* ========================================================================== */
/*  Spare parts                                                                */
/* ========================================================================== */

const partSeeds: PartSeed[] = [
  {
    // 11 minutes ago, flagged for a duplicated photo — the middle row of the
    // admin moderation queue in the source prototype.
    id: "p-chain-kit-used",
    category: "parts",
    partType: "transmission",
    brand: "DID",
    title: "Zəncir dəsti 525 VX3, b/u",
    localizedTitle: {
      az: "Zəncir dəsti 525 VX3, işlənmiş",
      en: "Chain kit 525 VX3, used",
      ru: "Комплект цепи 525 VX3, б/у",
    },
    price: 45,
    negotiable: true,
    condition: "used",
    stock: 1,
    sellerId: "u-tural",
    cityId: "city-sumqayit",
    districtId: "d-sumqayit-centre",
    tone: "steel",
    photoCount: 3,
    attributes: { oem: false, warrantyMonths: 0 },
    compatibility: [fits("Honda", ["CB650R", "CBR650R"], 2019, 2024)],
    description: {
      az: "Təxminən 8 000 km işləyib, hələ resursu var. Ulduzcuqlar da daxildir.",
      en: "Around 8,000 km on it, plenty of life left. Sprockets included.",
      ru: "Пробег около 8 000 км, ресурс ещё есть. Звёзды в комплекте.",
    },
    publishedAt: minutesAgo(11),
    views: 0,
    contacts: 0,
    favorites: 0,
    status: "moderation",
  },
  {
    id: "p-brake-pads-brembo",
    category: "parts",
    partType: "brakes",
    brand: "Brembo",
    title: "Brembo SA əyləc altlıqları",
    localizedTitle: {
      az: "Brembo SA əyləc altlıqları, ön",
      en: "Brembo SA brake pads, front",
      ru: "Тормозные колодки Brembo SA, передние",
    },
    price: 78,
    partNumber: "07BB33SA",
    stock: 14,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "slate",
    photoCount: 4,
    attributes: { oem: true, warrantyMonths: 12 },
    compatibility: [
      fits("Honda", ["CB650R", "CBR650R", "CB500X"], 2015, 2026),
      fits("Yamaha", ["MT-07", "MT-09", "XSR700"], 2014, 2026),
    ],
    description: {
      az: "Sinterlənmiş altlıqlar, yaş və quru havada sabit tormozlama. Anbarda var.",
      en: "Sintered pads with consistent bite in wet and dry. In stock.",
      ru: "Синтерные колодки, стабильное торможение в сухую и мокрую погоду. Есть на складе.",
    },
    publishedAt: daysAgo(4),
    views: 486,
    contacts: 17,
    favorites: 31,
    vip: true,
    vipUntil: "2026-08-06",
  },
  {
    id: "p-michelin-road5",
    category: "parts",
    partType: "tires",
    brand: "Michelin",
    title: "Michelin Road 5, 120/70 ZR17",
    localizedTitle: {
      az: "Michelin Road 5 təkər, 120/70 ZR17",
      en: "Michelin Road 5 tire, 120/70 ZR17",
      ru: "Резина Michelin Road 5, 120/70 ZR17",
    },
    price: 265,
    stock: 6,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "dusk",
    photoCount: 3,
    attributes: { oem: false, warrantyMonths: 24 },
    compatibility: [
      fits("Honda", ["CB650R", "CBR650R"], 2019, 2026),
      fits("Kawasaki", ["Z900", "Z650", "Ninja 400"], 2017, 2026),
      fits("Suzuki", ["GSX-S750", "SV650"], 2015, 2026),
    ],
    description: {
      az: "2026 istehsalı. Yaş asfaltda əla tutum, uzun resurs. Şinmontaj xidməti də var.",
      en: "2026 production. Excellent wet grip and long life. Fitting service available.",
      ru: "2026 год выпуска. Отличное сцепление на мокром, большой ресурс. Есть услуга шиномонтажа.",
    },
    publishedAt: daysAgo(7),
    views: 712,
    contacts: 24,
    favorites: 44,
  },
  {
    id: "p-oil-filter-hiflo",
    category: "parts",
    partType: "filters",
    brand: "Hiflofiltro",
    title: "Hiflofiltro HF204 yağ filtri",
    localizedTitle: {
      az: "Hiflofiltro HF204 yağ filtri",
      en: "Hiflofiltro HF204 oil filter",
      ru: "Масляный фильтр Hiflofiltro HF204",
    },
    price: 12,
    partNumber: "HF204",
    stock: 48,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "olive",
    photoCount: 2,
    attributes: { oem: false, warrantyMonths: 6 },
    compatibility: [
      fits("Honda", ["CB650R", "CBR650R", "CB500X", "Rebel 500"], 2013, 2026),
      fits("Yamaha", ["MT-07", "MT-09", "YZF-R3", "Tracer 700"], 2014, 2026),
      fits("Kawasaki", ["Z900", "Z650", "Versys 650"], 2010, 2026),
    ],
    description: {
      az: "Ən çox satılan filtr. Böyük həcmdə alışda endirim.",
      en: "Our best-selling filter. Discounts on bulk orders.",
      ru: "Самый продаваемый фильтр. Скидка при заказе от нескольких штук.",
    },
    publishedAt: daysAgo(2),
    views: 1_204,
    contacts: 52,
    favorites: 18,
  },
  {
    id: "p-battery-yuasa",
    category: "parts",
    partType: "battery",
    brand: "Yuasa",
    title: "Yuasa YTZ10S akkumulyator",
    localizedTitle: {
      az: "Yuasa YTZ10S akkumulyator",
      en: "Yuasa YTZ10S battery",
      ru: "Аккумулятор Yuasa YTZ10S",
    },
    price: 145,
    partNumber: "YTZ10S",
    stock: 9,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "clay",
    photoCount: 3,
    attributes: { oem: true, warrantyMonths: 18 },
    compatibility: [
      fits("Honda", ["CB650R", "CBR650R"], 2019, 2026),
      fits("Yamaha", ["MT-07", "YZF-R3"], 2014, 2026),
    ],
    description: {
      az: "Orijinal Yuasa, quru doldurulmuş. Zəmanət 18 ay.",
      en: "Genuine Yuasa, dry-charged. 18-month warranty.",
      ru: "Оригинальный Yuasa, сухозаряженный. Гарантия 18 месяцев.",
    },
    publishedAt: daysAgo(10),
    views: 398,
    contacts: 14,
    favorites: 21,
  },
  {
    id: "p-exhaust-akrapovic",
    category: "parts",
    partType: "engine",
    brand: "Akrapovič",
    title: "Akrapovič Slip-On egzoz, b/u",
    localizedTitle: {
      az: "Akrapovič Slip-On egzoz, işlənmiş",
      en: "Akrapovič Slip-On exhaust, used",
      ru: "Выхлоп Akrapovič Slip-On, б/у",
    },
    price: 620,
    negotiable: true,
    condition: "used",
    stock: 1,
    sellerId: "u-kamran",
    cityId: "city-baku",
    districtId: "d-nizami",
    tone: "steel",
    photoCount: 5,
    attributes: { oem: false, warrantyMonths: 0 },
    compatibility: [fits("Kawasaki", ["Z900"], 2017, 2023)],
    description: {
      az: "Titan, bir mövsüm istifadə olunub. Db-killer daxildir, sertifikat var.",
      en: "Titanium, one season of use. Db-killer included, certificate available.",
      ru: "Титан, использовался один сезон. Db-killer в комплекте, сертификат есть.",
    },
    publishedAt: daysAgo(6),
    views: 541,
    contacts: 19,
    favorites: 47,
  },
  {
    id: "p-mirror-set",
    category: "parts",
    partType: "body",
    brand: "Rizoma",
    title: "Rizoma güzgü dəsti",
    localizedTitle: {
      az: "Rizoma güzgü dəsti, alüminium",
      en: "Rizoma mirror set, aluminium",
      ru: "Комплект зеркал Rizoma, алюминий",
    },
    price: 190,
    stock: 4,
    delivery: true,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    districtId: "d-narimanov",
    tone: "sand",
    photoCount: 3,
    attributes: { oem: false, warrantyMonths: 12 },
    compatibility: [
      fits("Ducati", ["Monster 821", "Scrambler Icon"], 2014, 2026),
      fits("Yamaha", ["MT-07", "MT-09"], 2014, 2026),
    ],
    description: {
      az: "CNC alüminium, universal adapterlərlə. İki rəngdə mövcuddur.",
      en: "CNC aluminium with universal adapters. Available in two finishes.",
      ru: "ЦНК-алюминий, с универсальными адаптерами. Есть в двух цветах.",
    },
    publishedAt: daysAgo(12),
    views: 267,
    contacts: 8,
    favorites: 15,
  },
  {
    id: "p-fork-seals",
    category: "parts",
    partType: "suspension",
    brand: "All Balls",
    title: "Çəngəl salnikləri 41 mm",
    localizedTitle: {
      az: "Çəngəl salnikləri, 41 mm",
      en: "Fork seals, 41 mm",
      ru: "Сальники вилки, 41 мм",
    },
    price: 34,
    stock: 11,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "olive",
    photoCount: 2,
    attributes: { oem: false, warrantyMonths: 6 },
    compatibility: [fits("Suzuki", ["GSX-S750", "SV650", "GSX-R600"], 2011, 2026)],
    description: {
      az: "Dəst halında: salnik və toz qoruyucusu. Quraşdırma xidməti də var.",
      en: "Sold as a set: seal plus dust cover. Fitting service available.",
      ru: "Продаются комплектом: сальник и пыльник. Есть услуга установки.",
    },
    publishedAt: daysAgo(19),
    views: 189,
    contacts: 6,
    favorites: 7,
  },
  {
    id: "p-led-headlight",
    category: "parts",
    partType: "electrical",
    brand: "Osram",
    title: "Osram LED fara lampası H4",
    localizedTitle: {
      az: "Osram LED fara lampası H4",
      en: "Osram LED headlight bulb H4",
      ru: "LED-лампа фары Osram H4",
    },
    price: 56,
    stock: 22,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "amber",
    photoCount: 2,
    attributes: { oem: false, warrantyMonths: 12 },
    compatibility: [
      fits("Royal Enfield", ["Classic 350", "Himalayan"], 2016, 2026),
      fits("Bajaj", ["Pulsar NS200", "Dominar 400"], 2012, 2026),
    ],
    description: {
      az: "Standart halogen lampanın yerinə. Quraşdırma sadədir, adapter tələb olunmur.",
      en: "Direct replacement for the standard halogen. Simple fit, no adapter required.",
      ru: "Прямая замена штатной галогенной лампы. Ставится просто, адаптер не нужен.",
    },
    publishedAt: daysAgo(15),
    views: 334,
    contacts: 11,
    favorites: 12,
  },
  {
    id: "p-scooter-belt",
    category: "parts",
    partType: "transmission",
    brand: "Malossi",
    title: "Malossi variator qayışı",
    localizedTitle: {
      az: "Malossi variator qayışı",
      en: "Malossi variator belt",
      ru: "Ремень вариатора Malossi",
    },
    price: 42,
    stock: 17,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "clay",
    photoCount: 2,
    attributes: { oem: false, warrantyMonths: 6 },
    compatibility: [
      fits("Vespa", ["Primavera 150", "Sprint 150", "GTS 300"], 2014, 2026),
      fits("Piaggio", ["Liberty 125", "Beverly 300"], 2011, 2026),
    ],
    description: {
      az: "Skuterlər üçün gücləndirilmiş qayış. Hər 10 000 km-dən bir dəyişdirilməsi tövsiyə olunur.",
      en: "Reinforced belt for scooters. Replacement recommended every 10,000 km.",
      ru: "Усиленный ремень для скутеров. Замена рекомендуется каждые 10 000 км.",
    },
    publishedAt: daysAgo(21),
    views: 276,
    contacts: 9,
    favorites: 10,
  },
  {
    id: "p-ebike-battery",
    category: "parts",
    partType: "battery",
    brand: "Segway-Ninebot",
    title: "Ninebot Max xarici batareya",
    localizedTitle: {
      az: "Ninebot Max üçün xarici batareya",
      en: "External battery for Ninebot Max",
      ru: "Внешняя батарея для Ninebot Max",
    },
    price: 310,
    stock: 3,
    delivery: true,
    sellerId: "u-elektro-ride",
    cityId: "city-baku",
    districtId: "d-bulvar",
    tone: "sage",
    photoCount: 3,
    attributes: { oem: true, warrantyMonths: 12 },
    compatibility: [fits("Segway-Ninebot", ["Max G30", "F40"], 2019, 2026)],
    description: {
      az: "Yürüş məsafəsini təxminən iki dəfə artırır. Quraşdırma daxildir.",
      en: "Roughly doubles the range. Installation included.",
      ru: "Увеличивает запас хода примерно вдвое. Установка включена.",
    },
    publishedAt: daysAgo(9),
    views: 421,
    contacts: 16,
    favorites: 29,
  },
  {
    id: "p-bike-groupset",
    category: "parts",
    partType: "transmission",
    brand: "Shimano",
    title: "Shimano Deore M6100 qrupset",
    localizedTitle: {
      az: "Shimano Deore M6100 qrupset, 12 sürət",
      en: "Shimano Deore M6100 groupset, 12-speed",
      ru: "Группа Shimano Deore M6100, 12 скоростей",
    },
    price: 520,
    negotiable: true,
    stock: 2,
    delivery: true,
    sellerId: "u-veloservis-28may",
    cityId: "city-baku",
    districtId: "d-28may",
    tone: "steel",
    photoCount: 4,
    attributes: { oem: true, warrantyMonths: 12 },
    compatibility: [
      fits("Trek", ["Marlin 7"], 2018, 2026),
      fits("Giant", ["Talon 3"], 2018, 2026),
      fits("Merida", ["Big Nine 100"], 2018, 2026),
    ],
    description: {
      az: "Tam dəst: sürət qolu, arxa pərakəndə, kaset, zəncir. Quraşdırma ayrıca.",
      en: "Complete set: shifter, rear derailleur, cassette, chain. Fitting quoted separately.",
      ru: "Полный комплект: манетка, задний переключатель, кассета, цепь. Установка отдельно.",
    },
    publishedAt: daysAgo(17),
    views: 213,
    contacts: 7,
    favorites: 14,
  },
];

/* ========================================================================== */
/*  Riding gear                                                                */
/* ========================================================================== */

const gearSeeds: PartSeed[] = [
  {
    id: "g-shoei-nxr2",
    category: "gear",
    partType: "helmet",
    brand: "Shoei",
    title: "Shoei NXR2 dəbilqə",
    localizedTitle: {
      az: "Shoei NXR2 inteqral dəbilqə",
      en: "Shoei NXR2 full-face helmet",
      ru: "Интегральный шлем Shoei NXR2",
    },
    price: 640,
    stock: 5,
    delivery: true,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    districtId: "d-narimanov",
    tone: "slate",
    photoCount: 5,
    attributes: { size: "l", certification: "ece2206", colour: "black" },
    compatibility: [],
    description: {
      az: "Yüngül, səssiz, Pinlock daxildir. Ölçüləri M, L, XL mövcuddur.",
      en: "Light, quiet, Pinlock included. Available in M, L and XL.",
      ru: "Лёгкий, тихий, Pinlock в комплекте. Есть размеры M, L, XL.",
    },
    publishedAt: daysAgo(5),
    views: 588,
    contacts: 21,
    favorites: 52,
    vip: true,
    vipUntil: "2026-08-08",
  },
  {
    id: "g-agv-k3",
    category: "gear",
    partType: "helmet",
    brand: "AGV",
    title: "AGV K3 dəbilqə",
    localizedTitle: {
      az: "AGV K3 inteqral dəbilqə",
      en: "AGV K3 full-face helmet",
      ru: "Интегральный шлем AGV K3",
    },
    price: 295,
    stock: 8,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "dusk",
    photoCount: 4,
    attributes: { size: "m", certification: "ece2206", colour: "white" },
    compatibility: [],
    description: {
      az: "Daxili günəş vizoru var. Gündəlik sürüş üçün optimal seçim.",
      en: "Built-in sun visor. A solid choice for everyday riding.",
      ru: "Есть встроенный солнцезащитный визор. Оптимальный вариант на каждый день.",
    },
    publishedAt: daysAgo(8),
    views: 462,
    contacts: 18,
    favorites: 34,
  },
  {
    id: "g-dainese-jacket",
    category: "gear",
    partType: "jacket",
    brand: "Dainese",
    title: "Dainese tekstil gödəkçə",
    localizedTitle: {
      az: "Dainese tekstil moto gödəkçə",
      en: "Dainese textile riding jacket",
      ru: "Текстильная мотокуртка Dainese",
    },
    price: 430,
    negotiable: true,
    condition: "used",
    stock: 1,
    sellerId: "u-rashad",
    cityId: "city-baku",
    districtId: "d-yasamal",
    tone: "olive",
    photoCount: 4,
    attributes: { size: "l", certification: "ce", colour: "black" },
    compatibility: [],
    description: {
      az: "Bir mövsüm geyinilib. Çiyin, dirsək və kürək qoruyucuları yerindədir. Ventilyasiya zipləri var.",
      en: "Worn for one season. Shoulder, elbow and back armour all present. Vented zips.",
      ru: "Носил один сезон. Защита плеч, локтей и спины на месте. Есть вентиляционные молнии.",
    },
    publishedAt: daysAgo(3),
    views: 231,
    contacts: 6,
    favorites: 18,
  },
  {
    id: "g-alpinestars-gloves",
    category: "gear",
    partType: "gloves",
    brand: "Alpinestars",
    title: "Alpinestars SMX-2 əlcəklər",
    localizedTitle: {
      az: "Alpinestars SMX-2 dəri əlcəklər",
      en: "Alpinestars SMX-2 leather gloves",
      ru: "Кожаные перчатки Alpinestars SMX-2",
    },
    price: 118,
    stock: 12,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "clay",
    photoCount: 3,
    attributes: { size: "m", certification: "ce", colour: "black" },
    compatibility: [],
    description: {
      az: "Dəri, biləkdə iki bağlama. Sensor ekranla işləyir.",
      en: "Leather, twin wrist closure. Touchscreen compatible.",
      ru: "Кожа, двойная фиксация на запястье. Работают с сенсорным экраном.",
    },
    publishedAt: daysAgo(13),
    views: 297,
    contacts: 12,
    favorites: 16,
  },
  {
    id: "g-sidi-boots",
    category: "gear",
    partType: "boots",
    brand: "Sidi",
    title: "Sidi moto çəkmələri",
    localizedTitle: {
      az: "Sidi moto çəkmələri",
      en: "Sidi riding boots",
      ru: "Мотоботы Sidi",
    },
    price: 340,
    stock: 4,
    delivery: true,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    districtId: "d-narimanov",
    tone: "sand",
    photoCount: 4,
    attributes: { size: "xl", certification: "ce", colour: "black" },
    compatibility: [],
    description: {
      az: "Topuq qoruyucusu, sürüşməyən altlıq. 42–45 ölçülər var.",
      en: "Ankle protection, non-slip sole. Sizes 42–45 in stock.",
      ru: "Защита щиколотки, нескользящая подошва. Размеры 42–45 в наличии.",
    },
    publishedAt: daysAgo(23),
    views: 176,
    contacts: 5,
    favorites: 9,
  },
  {
    id: "g-givi-topcase",
    category: "gear",
    partType: "luggage",
    brand: "Givi",
    title: "Givi 45 l baqaj qutusu",
    localizedTitle: {
      az: "Givi 45 l arxa baqaj qutusu",
      en: "Givi 45 l top case",
      ru: "Кофр Givi 45 л",
    },
    price: 215,
    stock: 6,
    delivery: true,
    sellerId: "u-motoparts-az",
    cityId: "city-baku",
    districtId: "d-binagadi",
    tone: "steel",
    photoCount: 3,
    attributes: { size: "l", certification: "ce", colour: "black" },
    compatibility: [
      fits("Honda", ["CB500X"], 2013, 2026),
      fits("Kawasaki", ["Versys 650"], 2010, 2026),
      fits("Benelli", ["TRK 502"], 2017, 2026),
    ],
    description: {
      az: "İki dəbilqə tutur. Universal ploşadka daxildir.",
      en: "Fits two helmets. Universal mounting plate included.",
      ru: "Вмещает два шлема. Универсальная площадка в комплекте.",
    },
    publishedAt: daysAgo(11),
    views: 344,
    contacts: 13,
    favorites: 22,
  },
  {
    id: "g-back-protector",
    category: "gear",
    partType: "protection",
    brand: "Forcefield",
    title: "Forcefield kürək qoruyucusu",
    localizedTitle: {
      az: "Forcefield kürək qoruyucusu",
      en: "Forcefield back protector",
      ru: "Защита спины Forcefield",
    },
    price: 165,
    stock: 7,
    delivery: true,
    sellerId: "u-caspian-bikes",
    cityId: "city-baku",
    districtId: "d-narimanov",
    tone: "amber",
    photoCount: 3,
    attributes: { size: "m", certification: "ce", colour: "grey" },
    compatibility: [],
    description: {
      az: "Level 2 sertifikat. Gödəkçənin altından və ya ayrıca geyinmək olar.",
      en: "Level 2 certified. Wear under a jacket or as a standalone harness.",
      ru: "Сертификация Level 2. Можно носить под курткой или отдельно.",
    },
    publishedAt: daysAgo(26),
    views: 158,
    contacts: 4,
    favorites: 11,
  },
  {
    id: "g-bike-helmet-abus",
    category: "gear",
    partType: "helmet",
    brand: "Abus",
    title: "Abus velosiped dəbilqəsi",
    localizedTitle: {
      az: "Abus velosiped dəbilqəsi",
      en: "Abus cycling helmet",
      ru: "Велосипедный шлем Abus",
    },
    price: 74,
    stock: 15,
    delivery: true,
    sellerId: "u-veloservis-28may",
    cityId: "city-baku",
    districtId: "d-28may",
    tone: "sage",
    photoCount: 3,
    attributes: { size: "m", certification: "ce", colour: "white" },
    compatibility: [],
    description: {
      az: "Yüngül, yaxşı ventilyasiya. Arxa LED işıq daxildir.",
      en: "Light with good ventilation. Rear LED light included.",
      ru: "Лёгкий, хорошая вентиляция. Задний LED-фонарь в комплекте.",
    },
    publishedAt: daysAgo(18),
    views: 203,
    contacts: 8,
    favorites: 13,
  },
];

/* ========================================================================== */

export const parts: Part[] = [...partSeeds, ...gearSeeds].map(build);

export const partById = new Map(parts.map((part) => [part.id, part]));

export const activeParts = parts.filter((part) => part.status === "active");

export function partsByCategory(category: "parts" | "gear") {
  return activeParts.filter((part) => part.category === category);
}

export function partsBySeller(sellerId: string) {
  return parts.filter((part) => part.sellerId === sellerId);
}

/** Fitment search: everything that fits a given make, and optionally a model. */
export function partsFitting(makeId: string, modelId?: string) {
  return activeParts.filter((part) =>
    part.compatibility.some(
      (entry) =>
        entry.makeId === makeId &&
        (!modelId || entry.modelIds.length === 0 || entry.modelIds.includes(modelId)),
    ),
  );
}

/** Highest-traffic parts, used by the home screen's "popular parts" rail. */
export const popularParts = [...activeParts]
  .sort((a, b) => b.stats.views - a.stats.views)
  .slice(0, 8);

export const recentParts = [...activeParts].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
