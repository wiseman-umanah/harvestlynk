"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard",      icon: "ri-layout-grid-line",  href: "/dashboard/buyer" },
  { label: "Market Place",   icon: "ri-store-2-line",      href: "/dashboard/buyer/marketplace" },
  { label: "Orders",         icon: "ri-list-ordered",      href: "/dashboard/buyer/orders" },
  { label: "Wallet Balance", icon: "ri-wallet-3-line",     href: "/dashboard/buyer/wallet" },
  { label: "Profile",        icon: "ri-user-line",         href: "/dashboard/buyer/profile" },
];

export default function BuyerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-[#E0D5B7] min-h-screen">
      <nav className="pt-4 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm font-medium transition-colors
                ${active
                  ? "bg-[#0D631B] text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              <i className={`${item.icon} text-lg`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
