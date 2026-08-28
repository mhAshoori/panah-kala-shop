import localFont from "next/font/local";

// Self-hosted Shabnam (Persian) — the primary typeface of the app.
// Weights are declared so real bold/light files are used (no synthesis).
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
