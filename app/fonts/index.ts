import localFont from "next/font/local";

export const shabnamFont = localFont({
  src: [
    { path: "./shabnam/Shabnam.ttf" },
    { path: "./shabnam/Shabnam-Bold.ttf" },
    { path: "./shabnam/Shabnam-Light.ttf" },
    { path: "./shabnam/Shabnam-Medium.ttf" },
    { path: "./shabnam/Shabnam-Thin.ttf" },
  ],
  variable: "--font-shabnam-font",
  display: "swap",
});
