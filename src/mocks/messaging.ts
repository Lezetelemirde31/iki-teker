import { daysAgo, hoursAgo, minutesAgo } from "@/lib/demo-clock";
import type { AppNotification, ChatThread, Message, SavedSearch } from "@/types";

let messageCounter = 0;

function message(
  threadId: string,
  authorId: string,
  createdAt: string,
  body: string | undefined,
  options: { read?: boolean; kind?: Message["kind"]; fileName?: string; fileSize?: string } = {},
): Message {
  messageCounter += 1;
  return {
    id: `m-${messageCounter}`,
    threadId,
    authorId,
    kind: options.kind ?? "text",
    body,
    fileName: options.fileName,
    fileSize: options.fileSize,
    createdAt,
    readByRecipient: options.read ?? true,
  };
}

/**
 * Conversations are stored verbatim rather than translated. Real chats in Baku
 * switch between Azerbaijani and Russian mid-thread, and the source prototype
 * shows exactly that — localising it would make the demo feel less authentic,
 * not more.
 */
export const chatThreads: ChatThread[] = [
  {
    // The thread reproduced in the source prototype, timestamps included.
    id: "th-cb650r-rashad-elvin",
    participantIds: ["u-rashad", "u-elvin"],
    listingId: "l-cb650r-rashad",
    messages: [
      message("th-cb650r-rashad-elvin", "u-elvin", "2026-07-27T14:02:00+04:00", "Salam! Мотоцикл ещё в наличии?"),
      message(
        "th-cb650r-rashad-elvin",
        "u-rashad",
        "2026-07-27T14:05:00+04:00",
        "Salam, да, в наличии. Смотреть можно в Ясамале в любой день после 18:00.",
      ),
      message(
        "th-cb650r-rashad-elvin",
        "u-elvin",
        "2026-07-27T14:06:00+04:00",
        "Сервисную книжку покажете? И резина какого года?",
      ),
      message(
        "th-cb650r-rashad-elvin",
        "u-rashad",
        "2026-07-27T14:08:00+04:00",
        "Конечно. Резина Michelin Road 5, поставил прошлым летом, пробег на ней ~4 000.",
      ),
      message("th-cb650r-rashad-elvin", "u-rashad", "2026-07-27T14:08:30+04:00", undefined, {
        kind: "file",
        fileName: "servis-kitabcasi.pdf",
        fileSize: "2.4 MB",
      }),
      message(
        "th-cb650r-rashad-elvin",
        "u-elvin",
        "2026-07-27T14:11:00+04:00",
        "Отлично. Завтра в 18:30 подъеду.",
        { read: false },
      ),
    ],
    unreadCount: 1,
    updatedAt: "2026-07-27T14:11:00+04:00",
    contactRevealed: true,
    archived: false,
  },
  {
    // Rental thread: contact details stay hidden until the booking is confirmed.
    id: "th-vespa-rashad-kamran",
    participantIds: ["u-rashad", "u-kamran"],
    listingId: "l-vespa-rashad",
    bookingId: "bk-2489",
    messages: [
      message(
        "th-vespa-rashad-kamran",
        "u-kamran",
        hoursAgo(5),
        "Salam! 22–24 avqust üçün sorğu göndərdim. Dəbilqə var, deyəsən?",
      ),
      message(
        "th-vespa-rashad-kamran",
        "u-rashad",
        hoursAgo(4),
        "Salam! Bəli, dəbilqə və kilid qiymətə daxildir. Sorğunu axşam təsdiqləyəcəm.",
      ),
      message("th-vespa-rashad-kamran", "u-kamran", hoursAgo(4), "Çox sağ olun 👍", { read: false }),
    ],
    unreadCount: 1,
    updatedAt: hoursAgo(4),
    contactRevealed: false,
    archived: false,
  },
  {
    id: "th-vespa-rashad-nermin",
    participantIds: ["u-rashad", "u-nermin"],
    listingId: "l-vespa-rashad",
    bookingId: "bk-2477",
    messages: [
      message("th-vespa-rashad-nermin", "u-nermin", daysAgo(2), "Salam, bronu təsdiqlədiniz, çox sağ olun!"),
      message(
        "th-vespa-rashad-nermin",
        "u-rashad",
        daysAgo(2),
        "Xoş gəlmisiniz. 8 avqust saat 10:00-da metronun yanında görüşürük.",
      ),
      message("th-vespa-rashad-nermin", "u-nermin", daysAgo(1), "Razıyam. Müqavilə SMS-lə gəldi."),
    ],
    unreadCount: 0,
    updatedAt: daysAgo(1),
    contactRevealed: true,
    archived: false,
  },
  {
    id: "th-z900-kamran-rashad",
    participantIds: ["u-rashad", "u-kamran"],
    listingId: "l-z900-kamran",
    messages: [
      message("th-z900-kamran-rashad", "u-rashad", daysAgo(4), "Салам! Z900 ещё продаётся? Торг возможен?"),
      message(
        "th-z900-kamran-rashad",
        "u-kamran",
        daysAgo(4),
        "Salam! Bəli, satılır. Real alıcıya bir az güzəşt edərəm.",
      ),
      message("th-z900-kamran-rashad", "u-rashad", daysAgo(3), "Понял, на выходных напишу."),
    ],
    unreadCount: 0,
    updatedAt: daysAgo(3),
    contactRevealed: true,
    archived: false,
  },
  {
    id: "th-parts-motoparts",
    participantIds: ["u-rashad", "u-motoparts-az"],
    listingId: "p-michelin-road5",
    messages: [
      message("th-parts-motoparts", "u-rashad", daysAgo(6), "Salam, 180/55 arxa təkər də var?"),
      message(
        "th-parts-motoparts",
        "u-motoparts-az",
        daysAgo(6),
        "Salam! Bəli, anbarda var — 285 ₼. Şinmontaj 20 ₼.",
      ),
      message("th-parts-motoparts", "u-rashad", daysAgo(6), "Sabah keçərəm, saxlayın zəhmət olmasa."),
      message("th-parts-motoparts", "u-motoparts-az", daysAgo(5), "Saxladıq, adınıza yazdıq 👌"),
    ],
    unreadCount: 0,
    updatedAt: daysAgo(5),
    contactRevealed: true,
    archived: false,
  },
  {
    id: "th-service-msb",
    participantIds: ["u-rashad", "u-moto-servis-baki"],
    messages: [
      message(
        "th-service-msb",
        "u-moto-servis-baki",
        daysAgo(7),
        "Salam! TO-2 üçün 30 iyul saat 11:30 təsdiqləndi. Motosikleti 15 dəqiqə əvvəl gətirin.",
      ),
      message("th-service-msb", "u-rashad", daysAgo(7), "Qəbul edildi, təşəkkürlər."),
    ],
    unreadCount: 0,
    updatedAt: daysAgo(7),
    contactRevealed: true,
    archived: false,
  },
  {
    id: "th-iron883-aysel",
    participantIds: ["u-rashad", "u-aysel"],
    listingId: "l-iron883-rashad",
    messages: [
      message("th-iron883-aysel", "u-aysel", minutesAgo(42), "Salam! Iron 883 üçün barter mümkündürmü?", {
        read: false,
      }),
    ],
    unreadCount: 1,
    updatedAt: minutesAgo(42),
    contactRevealed: true,
    archived: false,
  },
];

export const threadById = new Map(chatThreads.map((thread) => [thread.id, thread]));

export function threadsFor(userId: string) {
  return chatThreads
    .filter((thread) => thread.participantIds.includes(userId) && !thread.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function unreadThreadCount(userId: string) {
  return threadsFor(userId).filter((thread) => thread.unreadCount > 0).length;
}

/* -------------------------------------------------------------------------- */
/*  Saved searches                                                             */
/* -------------------------------------------------------------------------- */

export const savedSearches: SavedSearch[] = [
  {
    // "Honda under ₼15,000" — the example from the source specification.
    id: "ss-honda-15k",
    label: "Honda · ≤ ₼15,000",
    query: { category: "motorcycles", makeId: "make-honda", priceMax: 15_000, cityId: "city-baku" },
    newMatches: 3,
    notify: true,
    createdAt: daysAgo(21),
  },
  {
    id: "ss-rental-scooters",
    label: "Scooters with rental · Baku",
    query: { category: "scooters", hasRental: true, cityId: "city-baku" },
    newMatches: 1,
    notify: true,
    createdAt: daysAgo(12),
  },
  {
    id: "ss-adventure-600",
    label: "Adventure · 400–750 cm³",
    query: {
      category: "motorcycles",
      attributes: { bodyType: "adventure" },
      priceMin: 10_000,
      priceMax: 25_000,
    },
    newMatches: 0,
    notify: false,
    createdAt: daysAgo(34),
  },
];

/* -------------------------------------------------------------------------- */
/*  Notifications                                                              */
/* -------------------------------------------------------------------------- */

export const notifications: AppNotification[] = [
  {
    id: "n-1",
    kind: "booking",
    title: {
      az: "Yeni icarə sorğusu",
      en: "New rental request",
      ru: "Новый запрос на аренду",
    },
    body: {
      az: "Kamran H. — Vespa Primavera 150, 22–24 avqust, 2 gün",
      en: "Kamran H. — Vespa Primavera 150, Aug 22–24, 2 days",
      ru: "Кямран Г. — Vespa Primavera 150, 22–24 августа, 2 суток",
    },
    href: "/dashboard/bookings",
    createdAt: hoursAgo(5),
    read: false,
    entityId: "bk-2489",
  },
  {
    id: "n-2",
    kind: "message",
    title: { az: "Yeni mesaj", en: "New message", ru: "Новое сообщение" },
    body: {
      az: "Elvin Q.: «Отлично. Завтра в 18:30 подъеду.»",
      en: "Elvin Q.: “Great. I'll come by tomorrow at 18:30.”",
      ru: "Эльвин Г.: «Отлично. Завтра в 18:30 подъеду.»",
    },
    href: "/chats/th-cb650r-rashad-elvin",
    createdAt: minutesAgo(24),
    read: false,
    entityId: "th-cb650r-rashad-elvin",
  },
  {
    id: "n-3",
    kind: "savedSearch",
    title: {
      az: "«Honda · ≤ 15 000 ₼» üzrə 3 yeni elan",
      en: "3 new listings for “Honda · ≤ ₼15,000”",
      ru: "3 новых объявления по «Honda · ≤ 15 000 ₼»",
    },
    body: {
      az: "Honda CB500X, Honda Rebel 500 və daha 1 elan",
      en: "Honda CB500X, Honda Rebel 500 and 1 more",
      ru: "Honda CB500X, Honda Rebel 500 и ещё 1",
    },
    href: "/search?makeId=make-honda&priceMax=15000",
    createdAt: hoursAgo(9),
    read: false,
    entityId: "ss-honda-15k",
  },
  {
    id: "n-4",
    kind: "promotion",
    title: { az: "VIP 4 gün sonra bitir", en: "VIP expires in 4 days", ru: "VIP заканчивается через 4 дня" },
    body: {
      az: "Honda CB650R, 2019 — 31 iyula qədər. Uzatmaq üçün toxunun.",
      en: "Honda CB650R, 2019 — until July 31. Tap to extend.",
      ru: "Honda CB650R, 2019 — до 31 июля. Нажмите, чтобы продлить.",
    },
    href: "/dashboard/promotion",
    createdAt: hoursAgo(14),
    read: true,
    entityId: "l-cb650r-rashad",
  },
  {
    id: "n-5",
    kind: "moderation",
    title: { az: "Elan dərc olundu", en: "Listing published", ru: "Объявление опубликовано" },
    body: {
      az: "Harley-Davidson Iron 883, 2018 — moderasiyadan keçdi",
      en: "Harley-Davidson Iron 883, 2018 — passed moderation",
      ru: "Harley-Davidson Iron 883, 2018 — прошло модерацию",
    },
    href: "/listing/l-iron883-rashad",
    createdAt: daysAgo(1),
    read: true,
    entityId: "l-iron883-rashad",
  },
  {
    id: "n-6",
    kind: "review",
    title: { az: "Yeni rəy", en: "New review", ru: "Новый отзыв" },
    body: {
      az: "Elvin Q. sizə 5 ulduz verdi — Honda CB650R",
      en: "Elvin Q. left you 5 stars — Honda CB650R",
      ru: "Эльвин Г. поставил вам 5 звёзд — Honda CB650R",
    },
    href: "/seller/u-rashad",
    createdAt: daysAgo(2),
    read: true,
    entityId: "rev-4",
  },
  {
    id: "n-7",
    kind: "booking",
    title: { az: "İcarə təsdiqləndi", en: "Rental confirmed", ru: "Аренда подтверждена" },
    body: {
      az: "Nərmin S. — 8–12 avqust. Müqavilə SMS ilə imzalandı.",
      en: "Nərmin S. — Aug 8–12. Agreement signed via SMS.",
      ru: "Нармин С. — 8–12 августа. Договор подписан по SMS.",
    },
    href: "/dashboard/bookings",
    createdAt: daysAgo(2),
    read: true,
    entityId: "bk-2477",
  },
  {
    id: "n-8",
    kind: "priceDrop",
    title: { az: "Seçilmişlərdə qiymət düşdü", en: "Price drop in favourites", ru: "Снижена цена в избранном" },
    body: {
      az: "Kawasaki Z900, 2020 — 20 500 ₼ → 19 800 ₼",
      en: "Kawasaki Z900, 2020 — ₼20,500 → ₼19,800",
      ru: "Kawasaki Z900, 2020 — 20 500 ₼ → 19 800 ₼",
    },
    href: "/listing/l-z900-kamran",
    createdAt: daysAgo(3),
    read: true,
    entityId: "l-z900-kamran",
  },
  {
    id: "n-9",
    kind: "message",
    title: { az: "Servisdən mesaj", en: "Message from a workshop", ru: "Сообщение от сервиса" },
    body: {
      az: "Moto Servis Bakı: TO-2 üçün 30 iyul, 11:30 təsdiqləndi",
      en: "Moto Servis Bakı: Service 2 confirmed for July 30, 11:30",
      ru: "Moto Servis Bakı: ТО-2 подтверждено на 30 июля, 11:30",
    },
    href: "/chats/th-service-msb",
    createdAt: daysAgo(7),
    read: true,
    entityId: "th-service-msb",
  },
];

export function unreadNotificationCount() {
  return notifications.filter((notification) => !notification.read).length;
}
