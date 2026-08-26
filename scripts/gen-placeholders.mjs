// Generates SVG placeholder product images and banners into public/images.
// Run: node scripts/gen-placeholders.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'public', 'images', 'sample-products');
const bannerDir = join(process.cwd(), 'public', 'images');
mkdirSync(outDir, { recursive: true });

// Minimal white line-art icons drawn with basic shapes (stroke style)
const icons = {
  phone: `<rect x="230" y="170" width="140" height="260" rx="24"/><line x1="270" y1="200" x2="330" y2="200"/><circle cx="300" cy="395" r="14"/>`,
  laptop: `<rect x="180" y="190" width="240" height="150" rx="10"/><path d="M150 370 h300 l20 30 h-340 z"/><line x1="270" y1="215" x2="330" y2="215"/>`,
  earbuds: `<circle cx="250" cy="220" r="40"/><rect x="238" y="255" width="24" height="90" rx="12"/><circle cx="350" cy="220" r="40"/><rect x="338" y="255" width="24" height="90" rx="12"/>`,
  headphones: `<path d="M200 320 v-40 a100 100 0 0 1 200 0 v40"/><rect x="175" y="310" width="50" height="80" rx="20"/><rect x="375" y="310" width="50" height="80" rx="20"/>`,
  watch: `<rect x="245" y="210" width="110" height="160" rx="30"/><line x1="265" y1="180" x2="265" y2="212"/><line x1="335" y1="180" x2="335" y2="212"/><line x1="265" y1="368" x2="265" y2="400"/><line x1="335" y1="368" x2="335" y2="400"/><path d="M280 290 l15 15 l25 -30"/>`,
  tablet: `<rect x="205" y="165" width="190" height="270" rx="22"/><circle cx="300" cy="405" r="10"/>`,
  camera: `<rect x="185" y="225" width="230" height="150" rx="18"/><circle cx="300" cy="300" r="48"/><circle cx="300" cy="300" r="26"/><rect x="215" y="195" width="70" height="30" rx="8"/>`,
  speaker: `<rect x="235" y="170" width="130" height="260" rx="20"/><circle cx="300" cy="245" r="32"/><circle cx="300" cy="350" r="44"/>`,
  monitor: `<rect x="170" y="185" width="260" height="170" rx="12"/><line x1="300" y1="355" x2="300" y2="395"/><line x1="245" y1="405" x2="355" y2="405"/>`,
  console: `<path d="M215 240 h170 c30 0 45 30 45 60 s-8 60 -35 60 c-20 0 -28 -18 -45 -18 h-100 c-17 0 -25 18 -45 18 c-27 0 -35 -30 -35 -60 s15 -60 45 -60 z"/><circle cx="255" cy="295" r="16"/><circle cx="345" cy="295" r="16"/>`,
};

const products = [
  { file: 'p1', grad: ['#0ea5a4', '#0369a1'], icon: 'phone' },
  { file: 'p2', grad: ['#f59e0b', '#ea580c'], icon: 'phone' },
  { file: 'p3', grad: ['#6366f1', '#7c3aed'], icon: 'laptop' },
  { file: 'p4', grad: ['#ec4899', '#be123c'], icon: 'laptop' },
  { file: 'p5', grad: ['#10b981', '#047857'], icon: 'earbuds' },
  { file: 'p6', grad: ['#f43f5e', '#9f1239'], icon: 'headphones' },
  { file: 'p7', grad: ['#06b6d4', '#0e7490'], icon: 'watch' },
  { file: 'p8', grad: ['#8b5cf6', '#5b21b6'], icon: 'tablet' },
  { file: 'p9', grad: ['#334155', '#0f172a'], icon: 'camera' },
  { file: 'p10', grad: ['#84cc16', '#3f6212'], icon: 'speaker' },
  { file: 'p11', grad: ['#0ea5e9', '#1e40af'], icon: 'monitor' },
  { file: 'p12', grad: ['#f97316', '#b91c1c'], icon: 'console' },
];

const svg = ([a, b], inner, size = 600) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${size * 0.82}" cy="${size * 0.16}" r="${size * 0.22}" fill="#ffffff" opacity="0.08"/>
  <circle cx="${size * 0.14}" cy="${size * 0.86}" r="${size * 0.28}" fill="#ffffff" opacity="0.08"/>
  <g stroke="#ffffff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
    ${inner}
  </g>
</svg>`;

for (const p of products) {
  writeFileSync(join(outDir, `${p.file}.svg`), svg(p.grad, icons[p.icon]));
}

// Wide banners for featured deals
const banners = [
  { file: 'banner-1', grad: ['#0f766e', '#164e63'], icon: 'phone' },
  { file: 'banner-2', grad: ['#b45309', '#7c2d12'], icon: 'headphones' },
];

const bannerSvg = ([a, b], inner) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#g)"/>
  <circle cx="1050" cy="60" r="140" fill="#ffffff" opacity="0.07"/>
  <circle cx="150" cy="360" r="180" fill="#ffffff" opacity="0.07"/>
  <g transform="translate(480,-40)" stroke="#ffffff" stroke-width="9" fill="none"
     stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
    ${inner}
  </g>
</svg>`;

for (const b of banners) {
  writeFileSync(join(bannerDir, `${b.file}.svg`), bannerSvg(b.grad, icons[b.icon]));
}

console.log('Placeholder SVGs generated.');
