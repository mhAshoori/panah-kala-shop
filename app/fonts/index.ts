import localFont from "next/font/local";

// Self-hosted Persian fonts — the admin can switch the site font (see
// lib/site-settings.ts). Weights are declared so real bold/light files are
// used instead of synthetic ones.

export const shabnamFont = localFont({
  src: [
    { path: "./shabnam/Shabnam-Thin.ttf", weight: "100", style: "normal" },
    { path: "./shabnam/Shabnam-Light.ttf", weight: "300", style: "normal" },
    { path: "./shabnam/Shabnam.ttf", weight: "400", style: "normal" },
    { path: "./shabnam/Shabnam-Medium.ttf", weight: "500", style: "normal" },
    { path: "./shabnam/Shabnam-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-shabnam",
  display: "swap",
});

export const vazirmatnFont = localFont({
  src: [
    { path: "./vazin-matn/Vazirmatn-Thin.ttf", weight: "100", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-Light.ttf", weight: "300", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-Regular.ttf", weight: "400", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-Medium.ttf", weight: "500", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-Bold.ttf", weight: "700", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "./vazin-matn/Vazirmatn-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});
