import {
  Bell,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Home,
  MessageCircle,
  PlayCircle,
  Search,
  Users,
  UserRound,
  WalletCards,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const icons = {
  home: Home,
  play: PlayCircle,
  message: MessageCircle,
  bell: Bell,
  car: CarFront,
  search: Search,
  wallet: WalletCards,
  file: FileText,
  briefcase: BriefcaseBusiness,
  users: Users,
  user: UserRound,
};
export function NetizenIcon({
  name,
  ...props
}: { name: keyof typeof icons } & LucideProps) {
  const Icon: ComponentType<LucideProps> = icons[name];
  return <Icon {...props} />;
}
