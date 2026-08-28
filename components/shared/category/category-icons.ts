import {
  Camera,
  Gamepad2,
  Headphones,
  Laptop,
  Monitor,
  Package,
  Smartphone,
  Tablet,
  Watch,
  type LucideIcon,
} from 'lucide-react';

// Map of Category.icon keys (stored in the DB) to lucide icons.
// Shared by the header mega menu and the homepage category grid.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  watch: Watch,
  tablet: Tablet,
  camera: Camera,
  monitor: Monitor,
  'gamepad-2': Gamepad2,
  package: Package,
};

export function getCategoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICONS[icon] ?? Package;
}
