import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * This is what turns the site into something a phone will install: Android only
 * offers "Add to home screen" when a manifest declares a name, a start URL, a
 * standalone display mode and PNG icons at 192 and 512. It is also the document
 * Google reads when a Trusted Web Activity is submitted to the Play Store, so
 * the values here are the ones that end up on the store listing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Iki Tekerli — İkitəkərli texnika marketpleysi",
    short_name: "Iki Tekerli",
    description:
      "Azərbaycanda motosiklet, skuter, elektrik nəqliyyatı və velosipedlər üçün marketpleys — al, sat, ehtiyat hissəsi tap, servisə yazıl və ya günlük icarəyə götür.",
    // Left as the root so the locale middleware can honour the visitor's
    // language rather than pinning every installed copy to Azerbaijani.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#12110f",
    theme_color: "#f4f1ea",
    lang: "az",
    dir: "ltr",
    categories: ["shopping", "travel", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "İcarəyə sərbəst",
        short_name: "İcarə",
        url: "/az/search?hasRental=true",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Axtarış",
        short_name: "Axtarış",
        url: "/az/search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
