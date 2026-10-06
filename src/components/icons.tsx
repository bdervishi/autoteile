import {
  Circle,
  Disc3,
  Car,
  Cog,
  Lightbulb,
  Armchair,
  Radio,
  Wrench,
  Wind,
  Package,
  ShieldCheck,
  Baby,
  Sparkles,
  Truck,
} from "lucide-react";
import type { CATEGORIES } from "@/lib/constants";
const icons = {
  reifen: Circle,
  felgen: Disc3,
  kompletträder: Car,
  motor_antrieb: Cog,
  karosserie: Car,
  beleuchtung: Lightbulb,
  innenraum: Armchair,
  elektronik_multimedia: Radio,
  fahrwerk_bremsen: Wrench,
  auspuff: Wind,
  dachträger_anhängerkupplung: Truck,
  pflege_werkzeug: Sparkles,
  kindersitze: Baby,
  zubehör: Package,
  sonstiges: Wrench,
};
export function CategoryIcon({
  category,
  size = 24,
}: {
  category: (typeof CATEGORIES)[number];
  size?: number;
}) {
  const Icon = icons[category];
  return <Icon size={size} strokeWidth={1.5} />;
}
