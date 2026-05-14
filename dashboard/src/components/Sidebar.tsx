"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard",       icon: "ri-layout-grid-line",      href: "/dashboard/farmer" },
  { label: "AI Crop Doctor",  icon: "ri-medicine-bottle-line",   href: "/dashboard/farmer/ai-crop-doctor" },
  { label: "My farm",         icon: "ri-leaf-line",              href: "/dashboard/farmer/farm" },
  { label: "Market Place",    icon: "ri-store-2-line",           href: "/dashboard/farmer/marketplace" },
  { label: "Orders",          icon: "ri-list-ordered",           href: "/dashboard/farmer/orders" },
  { label: "Wallet Balance",  icon: "ri-wallet-3-line",          href: "/dashboard/farmer/wallet" },
  { label: "Profile",         icon: "ri-user-line",              href: "/dashboard/farmer/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    router.push("/signup/farmer");
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-[#E0D5B7] flex flex-col">
      <nav className="pt-4 px-3 flex-1">
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

      <div className="px-3 py-4 border-t border-[#E0D5B7]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <i className="ri-logout-box-r-line text-lg" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
