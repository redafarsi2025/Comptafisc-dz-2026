import { SidebarNavItem } from "@/types/nav-item";

const SIDENAV_ITEMS: SidebarNavItem[] = [
  {
    title: "Tableau de bord",
    path: "/dashboard",
    icon: <Icon icon="lucide:layout-dashboard" width="24" height="24" />,
  },
  {
    title: "Stocks & Patrimoine",
    path: "/dashboard/stocks",
    icon: <Icon icon="lucide:package" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: "Stocks", path: "/dashboard/stocks" },
      { title: "Immobilisations", path: "/dashboard/assets" },
    ],
  },
  {
    title: "Projets",
    path: "/dashboard/projects",
    icon: <Icon icon="lucide:folder-kanban" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: "Tous", path: "/dashboard/projects" },
      { title: "Actifs", path: "/dashboard/projects/active" },
      { title: "En attente", path: "/dashboard/projects/pending" },
      { title: "Archivés", path: "/dashboard/projects/archived" },
    ],
  },
  {
    title: "Messages",
    path: "/dashboard/messages",
    icon: <Icon icon="lucide:mail" width="24" height="24" />,
  },
  {
    title: "Paramètres",
    path: "/dashboard/settings",
    icon: <Icon icon="lucide:settings" width="24" height="24" />,
    submenu: true,
    subMenuItems: [
      { title: "Profil", path: "/dashboard/settings/profile" },
      { title: "Compte", path: "/dashboard/settings/account" },
      { title: "Apparence", path: "/dashboard/settings/appearance" },
      { title: "Notifications", path: "/dashboard/settings/notifications" },
      { title: "Affichage", path: "/dashboard/settings/display" },
      { title: "Avancé", path: "/dashboard/settings/advanced" },
    ],
  },
  {
    title: "Aide",
    path: "/dashboard/help",
    icon: <Icon icon="lucide:help-circle" width="24" height="24" />,
  },
];

// Add this line to fix the import error
import { Icon } from '@iconify/react';

export default SIDENAV_ITEMS;
