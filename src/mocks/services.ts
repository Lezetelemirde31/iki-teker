import { demoISODate } from "@/lib/demo-clock";
import type { Appointment, ArtTone, Photo, ServiceItem, Workshop } from "@/types";

function makePhotos(seed: string, count: number, tone: ArtTone, alt: string): Photo[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${seed}-p${index + 1}`,
    seed: `${seed}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
  }));
}

const weekdays = {
  az: "B.e – Ş",
  en: "Mon – Sat",
  ru: "Пн – Сб",
};

const everyday = {
  az: "Hər gün",
  en: "Every day",
  ru: "Ежедневно",
};

/**
 * The workshop directory. `promoted` marks paid priority placement — the
 * phase-two revenue line where service partners buy visibility, and the reason
 * the sort is "promoted first, then rating" rather than rating alone.
 */
export const workshops: Workshop[] = [
  {
    id: "ws-moto-servis-baki",
    slug: "moto-servis-baki",
    name: "Moto Servis Bakı",
    ownerId: "u-moto-servis-baki",
    rating: 4.9,
    reviewsCount: 87,
    distanceKm: 2.1,
    specialties: ["motorcycles", "scooters"],
    summary: {
      az: "TO, diaqnostika, şinmontaj",
      en: "Scheduled service, diagnostics, tire fitting",
      ru: "ТО, диагностика, шиномонтаж",
    },
    about: {
      az: "2019-cu ildən Yasamalda işləyirik. Yapon və Avropa motosikletləri üzrə ixtisaslaşmışıq, orijinal hissələrlə işləyirik. Zəmanət 6 ay.",
      en: "Operating in Yasamal since 2019. We specialise in Japanese and European motorcycles and work with genuine parts. Six-month guarantee on labour.",
      ru: "Работаем в Ясамале с 2019 года. Специализируемся на японских и европейских мотоциклах, работаем с оригинальными запчастями. Гарантия на работы 6 месяцев.",
    },
    cityId: "city-baku",
    districtId: "d-yasamal",
    address: {
      az: "Bakı, Yasamal, Şərifzadə küç. 203",
      en: "Baku, Yasamal, Sharifzade str. 203",
      ru: "Баку, Ясамал, ул. Шарифзаде 203",
    },
    phone: "+994 12 496 33 21",
    hours: { open: "09:00", close: "20:00", days: weekdays },
    mobileService: false,
    verified: true,
    promoted: true,
    photos: makePhotos("ws-moto-servis-baki", 5, "steel", "Moto Servis Bakı"),
    services: [],
  },
  {
    id: "ws-scooterfix",
    slug: "scooterfix",
    name: "ScooterFix",
    ownerId: "u-scooterfix",
    rating: 4.6,
    reviewsCount: 34,
    distanceKm: 3.8,
    specialties: ["scooters", "electric"],
    summary: {
      az: "Skuterlər, elektrosamokatlar, batareyalar",
      en: "Scooters, e-scooters, batteries",
      ru: "Скутеры, электросамокаты, батареи",
    },
    about: {
      az: "Skuter və elektrik nəqliyyatı üzrə servis. Batareya diaqnostikası və bərpası. Usta çağırışı şəhər daxilində.",
      en: "Service centre for scooters and electric vehicles. Battery diagnostics and refurbishment. Mobile mechanic anywhere in the city.",
      ru: "Сервис скутеров и электротранспорта. Диагностика и восстановление батарей. Выезд мастера по городу.",
    },
    cityId: "city-baku",
    districtId: "d-nasimi",
    address: {
      az: "Bakı, Nəsimi, Nizami küç. 88",
      en: "Baku, Nasimi, Nizami str. 88",
      ru: "Баку, Насими, ул. Низами 88",
    },
    phone: "+994 55 219 47 08",
    hours: { open: "10:00", close: "19:00", days: weekdays },
    mobileService: true,
    verified: true,
    promoted: false,
    photos: makePhotos("ws-scooterfix", 4, "olive", "ScooterFix"),
    services: [],
  },
  {
    id: "ws-veloservis-28may",
    slug: "veloservis-28-may",
    name: "Veloservis 28 May",
    ownerId: "u-veloservis-28may",
    rating: 4.7,
    reviewsCount: 51,
    distanceKm: 1.4,
    specialties: ["bicycles"],
    summary: {
      az: "Velo: baxım, yığılma, təkər tarazlaması",
      en: "Bicycles: servicing, assembly, wheel building",
      ru: "Вело: обслуживание, сборка, спицовка",
    },
    about: {
      az: "Velosiped servisi 28 May metrosunun yaxınlığında. Təkər yığılması və tarazlaşdırılması, qrupsetin tənzimlənməsi, tam baxım.",
      en: "Bicycle workshop near 28 May metro. Wheel building and truing, drivetrain setup, full overhauls.",
      ru: "Веломастерская рядом с метро «28 Мая». Сборка и правка колёс, настройка трансмиссии, полное обслуживание.",
    },
    cityId: "city-baku",
    districtId: "d-28may",
    address: {
      az: "Bakı, Nəsimi, Süleyman Rəhimov küç. 12",
      en: "Baku, Nasimi, Suleyman Rahimov str. 12",
      ru: "Баку, Насими, ул. Сулеймана Рагимова 12",
    },
    phone: "+994 70 903 51 74",
    hours: { open: "10:00", close: "20:00", days: everyday },
    mobileService: false,
    verified: false,
    promoted: false,
    photos: makePhotos("ws-veloservis-28may", 4, "clay", "Veloservis 28 May"),
    services: [],
  },
  {
    id: "ws-elektro-service",
    slug: "elektro-service-baku",
    name: "Elektro Service Baku",
    ownerId: "u-elektro-ride",
    rating: 4.5,
    reviewsCount: 29,
    distanceKm: 4.6,
    specialties: ["electric"],
    summary: {
      az: "Batareya, kontroller, mühərrik",
      en: "Batteries, controllers, motors",
      ru: "Батареи, контроллеры, моторы",
    },
    about: {
      az: "Yalnız elektrik nəqliyyatı: samokatlar, elektrovelosipedlər, elektroskuterlər. Batareya elementlərinin dəyişdirilməsi.",
      en: "Electric vehicles only: e-scooters, e-bikes and electric mopeds. Battery cell replacement available.",
      ru: "Только электротранспорт: самокаты, электровелосипеды, электроскутеры. Замена элементов батареи.",
    },
    cityId: "city-baku",
    districtId: "d-bulvar",
    address: {
      az: "Bakı, Səbail, Neftçilər pr. 26",
      en: "Baku, Sabail, Neftchilar ave. 26",
      ru: "Баку, Сабаил, пр. Нефтяников 26",
    },
    phone: "+994 55 700 12 45",
    hours: { open: "09:00", close: "21:00", days: everyday },
    mobileService: true,
    verified: true,
    promoted: true,
    photos: makePhotos("ws-elektro-service", 4, "sage", "Elektro Service Baku"),
    services: [],
  },
  {
    id: "ws-tire-express",
    slug: "tire-express",
    name: "Tire Express Baku",
    ownerId: "u-motoparts-az",
    rating: 4.4,
    reviewsCount: 63,
    distanceKm: 5.9,
    specialties: ["motorcycles", "scooters"],
    summary: {
      az: "Şinmontaj, tarazlaşdırma, təcili yardım",
      en: "Tire fitting, balancing, roadside help",
      ru: "Шиномонтаж, балансировка, выездная помощь",
    },
    about: {
      az: "Moto şinmontaj 20 dəqiqəyə. Yolda təcili köməklik xidməti də var.",
      en: "Motorcycle tire fitting in 20 minutes. Roadside assistance also available.",
      ru: "Мотошиномонтаж за 20 минут. Есть выездная помощь на дороге.",
    },
    cityId: "city-baku",
    districtId: "d-binagadi",
    address: {
      az: "Bakı, Binəqədi, Ziya Bünyadov pr. 120",
      en: "Baku, Binagadi, Ziya Bunyadov ave. 120",
      ru: "Баку, Бинагади, пр. Зии Буниятова 120",
    },
    phone: "+994 51 209 66 41",
    hours: { open: "08:30", close: "20:30", days: everyday },
    mobileService: true,
    verified: false,
    promoted: false,
    photos: makePhotos("ws-tire-express", 3, "dusk", "Tire Express Baku"),
    services: [],
  },
  {
    id: "ws-garage-77",
    slug: "garage-77",
    name: "Garage 77",
    ownerId: "u-caspian-bikes",
    rating: 4.8,
    reviewsCount: 46,
    distanceKm: 3.2,
    specialties: ["motorcycles"],
    summary: {
      az: "Kapital təmir, tüninq, rəngləmə",
      en: "Engine rebuilds, custom work, paint",
      ru: "Капремонт, тюнинг, покраска",
    },
    about: {
      az: "Mühərrikin kapital təmiri, custom layihələr, aerografiya. İş müddəti razılaşdırılır.",
      en: "Engine rebuilds, custom builds and airbrush work. Lead times agreed case by case.",
      ru: "Капитальный ремонт двигателя, кастом-проекты, аэрография. Сроки согласовываются индивидуально.",
    },
    cityId: "city-baku",
    districtId: "d-narimanov",
    address: {
      az: "Bakı, Nərimanov, Atatürk pr. 77",
      en: "Baku, Narimanov, Ataturk ave. 77",
      ru: "Баку, Нариманов, пр. Ататюрка 77",
    },
    phone: "+994 12 480 71 33",
    hours: { open: "10:00", close: "19:00", days: weekdays },
    mobileService: false,
    verified: true,
    promoted: false,
    photos: makePhotos("ws-garage-77", 5, "amber", "Garage 77"),
    services: [],
  },
  {
    id: "ws-ganja-moto",
    slug: "ganja-moto-servis",
    name: "Gəncə Moto Servis",
    ownerId: "u-veli-motors",
    rating: 4.3,
    reviewsCount: 18,
    distanceKm: 331,
    specialties: ["motorcycles", "scooters"],
    summary: {
      az: "TO, təmir, ehtiyat hissələri",
      en: "Servicing, repairs, spare parts",
      ru: "ТО, ремонт, запчасти",
    },
    about: {
      az: "Gəncədə yeganə ixtisaslaşmış moto servis. Regiondan gələnlər üçün eyni gün xidmət.",
      en: "The only specialised motorcycle workshop in Ganja. Same-day service for customers travelling in from the region.",
      ru: "Единственный специализированный мотосервис в Гяндже. Обслуживание в тот же день для приезжающих из региона.",
    },
    cityId: "city-ganja",
    districtId: "d-ganja-centre",
    address: {
      az: "Gəncə, Həsən Əliyev küç. 41",
      en: "Ganja, Hasan Aliyev str. 41",
      ru: "Гянджа, ул. Гасана Алиева 41",
    },
    phone: "+994 12 377 55 09",
    hours: { open: "09:00", close: "18:00", days: weekdays },
    mobileService: false,
    verified: false,
    promoted: false,
    photos: makePhotos("ws-ganja-moto", 3, "sand", "Gəncə Moto Servis"),
    services: [],
  },
  {
    id: "ws-bike-doctor",
    slug: "bike-doctor",
    name: "Bike Doctor",
    ownerId: "u-veloservis-28may",
    rating: 4.6,
    reviewsCount: 22,
    distanceKm: 6.4,
    specialties: ["bicycles", "electric"],
    summary: {
      az: "Velo və elektrovelo, usta çağırışı",
      en: "Bicycles and e-bikes, mobile mechanic",
      ru: "Вело и электровело, выезд мастера",
    },
    about: {
      az: "Ustanı ünvana çağırın — kiçik təmirlər yerində edilir. Elektrovelosipedlərin diaqnostikası da var.",
      en: "Call the mechanic to your address — minor repairs are done on the spot. E-bike diagnostics available too.",
      ru: "Вызовите мастера по адресу — мелкий ремонт делается на месте. Есть диагностика электровелосипедов.",
    },
    cityId: "city-baku",
    districtId: "d-xatai",
    address: {
      az: "Bakı, Xətai, Xocalı pr. 15",
      en: "Baku, Khatai, Khojaly ave. 15",
      ru: "Баку, Хатаи, пр. Ходжалы 15",
    },
    phone: "+994 70 903 51 75",
    hours: { open: "10:00", close: "20:00", days: everyday },
    mobileService: true,
    verified: false,
    promoted: false,
    photos: makePhotos("ws-bike-doctor", 3, "slate", "Bike Doctor"),
    services: [],
  },
];

/* -------------------------------------------------------------------------- */
/*  Service menus                                                              */
/* -------------------------------------------------------------------------- */

export const serviceItems: ServiceItem[] = [
  // Moto Servis Bakı
  {
    id: "svc-msb-to2",
    workshopId: "ws-moto-servis-baki",
    name: { az: "TO-2, 12 000 km", en: "Service 2, 12,000 km", ru: "ТО-2, 12 000 км" },
    priceFrom: 180,
    durationMinutes: 180,
    category: "motorcycles",
  },
  {
    id: "svc-msb-oil",
    workshopId: "ws-moto-servis-baki",
    name: { az: "Yağ və filtr dəyişimi", en: "Oil and filter change", ru: "Замена масла и фильтра" },
    priceFrom: 65,
    durationMinutes: 60,
    category: "motorcycles",
  },
  {
    id: "svc-msb-diag",
    workshopId: "ws-moto-servis-baki",
    name: { az: "Kompüter diaqnostikası", en: "Computer diagnostics", ru: "Компьютерная диагностика" },
    priceFrom: 40,
    durationMinutes: 45,
    category: "motorcycles",
  },
  {
    id: "svc-msb-chain",
    workshopId: "ws-moto-servis-baki",
    name: { az: "Zəncirin tənzimlənməsi", en: "Chain adjustment", ru: "Регулировка цепи" },
    priceFrom: 25,
    durationMinutes: 30,
    category: "motorcycles",
  },
  {
    id: "svc-msb-brakes",
    workshopId: "ws-moto-servis-baki",
    name: { az: "Əyləc altlıqlarının dəyişimi", en: "Brake pad replacement", ru: "Замена тормозных колодок" },
    priceFrom: 55,
    durationMinutes: 60,
    category: "motorcycles",
  },
  // ScooterFix
  {
    id: "svc-sf-battery",
    workshopId: "ws-scooterfix",
    name: { az: "Batareyanın diaqnostikası", en: "Battery diagnostics", ru: "Диагностика батареи" },
    priceFrom: 35,
    durationMinutes: 45,
    category: "electric",
  },
  {
    id: "svc-sf-belt",
    workshopId: "ws-scooterfix",
    name: { az: "Variator qayışının dəyişimi", en: "Variator belt replacement", ru: "Замена ремня вариатора" },
    priceFrom: 70,
    durationMinutes: 90,
    category: "scooters",
  },
  {
    id: "svc-sf-mobile",
    workshopId: "ws-scooterfix",
    name: { az: "Usta çağırışı", en: "Mobile mechanic call-out", ru: "Выезд мастера" },
    priceFrom: 30,
    durationMinutes: 60,
    category: "scooters",
  },
  // Veloservis 28 May
  {
    id: "svc-v28-full",
    workshopId: "ws-veloservis-28may",
    name: { az: "Tam baxım", en: "Full service", ru: "Полное обслуживание" },
    priceFrom: 60,
    durationMinutes: 120,
    category: "bicycles",
  },
  {
    id: "svc-v28-wheel",
    workshopId: "ws-veloservis-28may",
    name: { az: "Təkərin yığılması və tarazlaşdırılması", en: "Wheel build and true", ru: "Сборка и правка колеса" },
    priceFrom: 45,
    durationMinutes: 90,
    category: "bicycles",
  },
  {
    id: "svc-v28-assembly",
    workshopId: "ws-veloservis-28may",
    name: { az: "Yeni velosipedin yığılması", en: "New bike assembly", ru: "Сборка нового велосипеда" },
    priceFrom: 35,
    durationMinutes: 60,
    category: "bicycles",
  },
  // Elektro Service Baku
  {
    id: "svc-esb-cells",
    workshopId: "ws-elektro-service",
    name: { az: "Batareya elementlərinin dəyişimi", en: "Battery cell replacement", ru: "Замена элементов батареи" },
    priceFrom: 220,
    durationMinutes: 240,
    category: "electric",
  },
  {
    id: "svc-esb-controller",
    workshopId: "ws-elektro-service",
    name: { az: "Kontrollerin təmiri", en: "Controller repair", ru: "Ремонт контроллера" },
    priceFrom: 90,
    durationMinutes: 120,
    category: "electric",
  },
  // Tire Express
  {
    id: "svc-te-fit",
    workshopId: "ws-tire-express",
    name: { az: "Şinmontaj, bir təkər", en: "Tire fitting, per wheel", ru: "Шиномонтаж, одно колесо" },
    priceFrom: 20,
    durationMinutes: 25,
    category: "motorcycles",
  },
  {
    id: "svc-te-roadside",
    workshopId: "ws-tire-express",
    name: { az: "Yolda təcili yardım", en: "Roadside assistance", ru: "Помощь на дороге" },
    priceFrom: 50,
    durationMinutes: 60,
    category: "motorcycles",
  },
  // Garage 77
  {
    id: "svc-g77-rebuild",
    workshopId: "ws-garage-77",
    name: { az: "Mühərrikin kapital təmiri", en: "Engine rebuild", ru: "Капремонт двигателя" },
    priceFrom: 900,
    durationMinutes: 2_400,
    category: "motorcycles",
  },
  {
    id: "svc-g77-paint",
    workshopId: "ws-garage-77",
    name: { az: "Rəngləmə, bir element", en: "Paint, per panel", ru: "Покраска, один элемент" },
    priceFrom: 140,
    durationMinutes: 480,
    category: "motorcycles",
  },
  // Gəncə Moto Servis
  {
    id: "svc-gms-to",
    workshopId: "ws-ganja-moto",
    name: { az: "Planlı texniki baxış", en: "Scheduled service", ru: "Плановое ТО" },
    priceFrom: 120,
    durationMinutes: 150,
    category: "motorcycles",
  },
  // Bike Doctor
  {
    id: "svc-bd-mobile",
    workshopId: "ws-bike-doctor",
    name: { az: "Ünvana usta çağırışı", en: "Mechanic to your address", ru: "Мастер по адресу" },
    priceFrom: 25,
    durationMinutes: 45,
    category: "bicycles",
  },
  {
    id: "svc-bd-ebike",
    workshopId: "ws-bike-doctor",
    name: { az: "Elektrovelosiped diaqnostikası", en: "E-bike diagnostics", ru: "Диагностика электровелосипеда" },
    priceFrom: 40,
    durationMinutes: 60,
    category: "electric",
  },
];

// Attach each workshop's menu so a single object carries everything the
// workshop screen needs.
for (const workshop of workshops) {
  workshop.services = serviceItems.filter((item) => item.workshopId === workshop.id);
}

export const workshopById = new Map(workshops.map((workshop) => [workshop.id, workshop]));
export const serviceItemById = new Map(serviceItems.map((item) => [item.id, item]));

/** Promoted partners first, then rating — paid placement, exactly as specified. */
export const directoryOrder = [...workshops].sort((a, b) => {
  if (a.promoted !== b.promoted) return a.promoted ? -1 : 1;
  return b.rating - a.rating;
});

export function workshopsFor(specialty: string) {
  return workshops.filter((workshop) =>
    workshop.specialties.includes(specialty as Workshop["specialties"][number]),
  );
}

/* -------------------------------------------------------------------------- */
/*  Appointments                                                               */
/* -------------------------------------------------------------------------- */

export const appointments: Appointment[] = [
  {
    // The pre-filled booking form in the source prototype: Service 2, Thu July 30, 11:30.
    id: "ap-1",
    workshopId: "ws-moto-servis-baki",
    serviceId: "svc-msb-to2",
    customerId: "u-rashad",
    vehicleLabel: "Honda CB650R, 2019",
    listingId: "l-cb650r-rashad",
    date: "2026-07-30",
    time: "11:30",
    status: "confirmed",
    priceEstimate: 180,
  },
  {
    id: "ap-2",
    workshopId: "ws-scooterfix",
    serviceId: "svc-sf-belt",
    customerId: "u-rashad",
    vehicleLabel: "Vespa Primavera 150, 2021",
    listingId: "l-vespa-rashad",
    date: demoISODate(9),
    time: "16:00",
    status: "requested",
    priceEstimate: 70,
  },
  {
    id: "ap-3",
    workshopId: "ws-moto-servis-baki",
    serviceId: "svc-msb-oil",
    customerId: "u-rashad",
    vehicleLabel: "Harley-Davidson Iron 883, 2018",
    listingId: "l-iron883-rashad",
    date: "2026-07-11",
    time: "10:00",
    status: "completed",
    priceEstimate: 65,
  },
  {
    id: "ap-4",
    workshopId: "ws-veloservis-28may",
    serviceId: "svc-v28-full",
    customerId: "u-elvin",
    vehicleLabel: "Trek Marlin 7, 2023",
    listingId: "l-marlin7-elvin",
    date: "2026-07-19",
    time: "13:00",
    status: "completed",
    priceEstimate: 60,
  },
];

export function appointmentsFor(customerId: string) {
  return appointments.filter((appointment) => appointment.customerId === customerId);
}
