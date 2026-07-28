import type { City, District } from "@/types";

/**
 * Baku plus the regional centres where a two-wheeler market realistically
 * exists. Coordinates drive the "nearby" sort and the distance labels in the
 * services directory.
 */
export const cities: City[] = [
  {
    id: "city-baku",
    name: { az: "Bakı", en: "Baku", ru: "Баку" },
    coords: { lat: 40.4093, lng: 49.8671 },
    primary: true,
  },
  {
    id: "city-sumqayit",
    name: { az: "Sumqayıt", en: "Sumgait", ru: "Сумгаит" },
    coords: { lat: 40.5897, lng: 49.6686 },
    primary: false,
  },
  {
    id: "city-ganja",
    name: { az: "Gəncə", en: "Ganja", ru: "Гянджа" },
    coords: { lat: 40.6828, lng: 46.3606 },
    primary: false,
  },
  {
    id: "city-xirdalan",
    name: { az: "Xırdalan", en: "Khirdalan", ru: "Хырдалан" },
    coords: { lat: 40.4553, lng: 49.7561 },
    primary: false,
  },
  {
    id: "city-mingachevir",
    name: { az: "Mingəçevir", en: "Mingachevir", ru: "Мингечаур" },
    coords: { lat: 40.7703, lng: 47.0489 },
    primary: false,
  },
  {
    id: "city-lankaran",
    name: { az: "Lənkəran", en: "Lankaran", ru: "Ленкорань" },
    coords: { lat: 38.7529, lng: 48.8475 },
    primary: false,
  },
  {
    id: "city-quba",
    name: { az: "Quba", en: "Guba", ru: "Губа" },
    coords: { lat: 41.3612, lng: 48.5133 },
    primary: false,
  },
  {
    id: "city-shaki",
    name: { az: "Şəki", en: "Shaki", ru: "Шеки" },
    coords: { lat: 41.1919, lng: 47.1706 },
    primary: false,
  },
];

export const districts: District[] = [
  // ---- Baku -------------------------------------------------------------
  {
    id: "d-yasamal",
    cityId: "city-baku",
    name: { az: "Yasamal", en: "Yasamal", ru: "Ясамал" },
  },
  {
    id: "d-nasimi",
    cityId: "city-baku",
    name: { az: "Nəsimi", en: "Nasimi", ru: "Насими" },
  },
  {
    id: "d-narimanov",
    cityId: "city-baku",
    name: { az: "Nərimanov", en: "Narimanov", ru: "Нариманов" },
  },
  {
    id: "d-sabail",
    cityId: "city-baku",
    name: { az: "Səbail", en: "Sabail", ru: "Сабаил" },
  },
  {
    id: "d-icherisheher",
    cityId: "city-baku",
    name: { az: "İçərişəhər", en: "Icherisheher", ru: "Ичери-Шехер" },
  },
  {
    id: "d-bulvar",
    cityId: "city-baku",
    name: { az: "Bulvar", en: "Bulvar", ru: "Бульвар" },
  },
  {
    id: "d-xatai",
    cityId: "city-baku",
    name: { az: "Xətai", en: "Khatai", ru: "Хатаи" },
  },
  {
    id: "d-nizami",
    cityId: "city-baku",
    name: { az: "Nizami", en: "Nizami", ru: "Низами" },
  },
  {
    id: "d-binagadi",
    cityId: "city-baku",
    name: { az: "Binəqədi", en: "Binagadi", ru: "Бинагади" },
  },
  {
    id: "d-ganjlik",
    cityId: "city-baku",
    name: { az: "Gənclik", en: "Ganjlik", ru: "Гянджлик" },
  },
  {
    id: "d-xazar",
    cityId: "city-baku",
    name: { az: "Xəzər", en: "Khazar", ru: "Хазар" },
  },
  {
    id: "d-28may",
    cityId: "city-baku",
    name: { az: "28 May", en: "28 May", ru: "28 Мая" },
  },
  // ---- Other cities -----------------------------------------------------
  {
    id: "d-sumqayit-centre",
    cityId: "city-sumqayit",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-ganja-centre",
    cityId: "city-ganja",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-ganja-kepez",
    cityId: "city-ganja",
    name: { az: "Kəpəz", en: "Kepez", ru: "Кяпаз" },
  },
  {
    id: "d-xirdalan-centre",
    cityId: "city-xirdalan",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-mingachevir-centre",
    cityId: "city-mingachevir",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-lankaran-centre",
    cityId: "city-lankaran",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-quba-centre",
    cityId: "city-quba",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
  {
    id: "d-shaki-centre",
    cityId: "city-shaki",
    name: { az: "Mərkəz", en: "City centre", ru: "Центр" },
  },
];

export const defaultCityId = "city-baku";

export const cityById = new Map(cities.map((city) => [city.id, city]));
export const districtById = new Map(districts.map((district) => [district.id, district]));

export function districtsOf(cityId: string) {
  return districts.filter((district) => district.cityId === cityId);
}
