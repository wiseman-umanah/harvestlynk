"use client";
import { useState } from "react";

const moreProducts = [
  { name: "Fresh Habanero Peppers", price: "₦12,500", farm: "Kaduna Farm Hub", escrow: true, bg: "from-red-100 to-red-200", icon: "ri-leaf-line text-red-500" },
  { name: "Honey Beans (Oloyin)", price: "₦45,000", farm: "Lagos Logistics Center", escrow: true, bg: "from-amber-100 to-stone-200", icon: "ri-seedling-line text-amber-700" },
  { name: "Long Grain Parboiled Rice", price: "₦78,000", farm: "Kaduna Grains Reserve", escrow: true, bg: "from-gray-100 to-gray-200", icon: "ri-plant-line text-gray-500" },
];

export default function BuyerOrders() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Manage your recent purchases and track secure escrow delivery.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
          <i className="ri-lock-line" /> Payment held securely
        </div>
      </div>

      {/* Active in-transit order */}
      <div className="bg-white rounded-2xl border-l-4 border-l-amber-400 border border-gray-100 p-5">
        <div className="flex items-start gap-5">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center flex-shrink-0">
            <i className="ri-plant-line text-3xl text-stone-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">IN TRANSIT</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Large Yam Tubers (50kg Batch)</h3>
            <p className="text-gray-400 text-sm">Order #FC-99210 • Seller: Kaduna Roots Cooperative</p>

            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8a000] text-white text-sm font-medium hover:bg-[#d09000] transition-colors">
                <i className="ri-checkbox-circle-line" /> Confirm Receipt
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                <i className="ri-error-warning-line" /> Report Issue
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0D631B] text-[#0D631B] text-sm font-medium hover:bg-[#e8f5e9] transition-colors">
                Track Delivery
              </button>
            </div>
          </div>

          {/* Countdown */}
          <div className="text-right flex-shrink-0">
            <p className="text-gray-400 text-xs mb-1">Auto-release in:</p>
            <p className="text-red-500 font-bold text-xl flex items-center gap-1.5">
              <i className="ri-time-line text-base" /> 23:59:45
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-[#0D631B]">
          <i className="ri-shield-check-line" />
          Your money is safe until you confirm delivery. Funds are held in professional escrow.
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B]"
          />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          All Locations <i className="ri-arrow-down-s-line" />
        </button>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Product Type <i className="ri-arrow-down-s-line" />
        </button>
      </div>

      {/* More products grid */}
      <div className="grid grid-cols-3 gap-5">
        {moreProducts.map((p) => (
          <div key={p.name} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`relative h-44 bg-gradient-to-br ${p.bg} flex items-center justify-center`}>
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0D631B] flex items-center justify-center">
                <i className="ri-checkbox-circle-fill text-white text-sm" />
              </div>
              {p.escrow && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#0D631B]/90 text-white text-xs px-2 py-0.5 rounded-full">
                  <i className="ri-lock-line text-xs" /> ESCROW
                </div>
              )}
              <i className={`${p.icon} text-5xl`} />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                <p className="text-[#0D631B] font-bold text-sm">{p.price}</p>
              </div>
              <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                <i className="ri-map-pin-line text-xs" /> {p.farm}
              </p>
              <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
                <i className="ri-shield-check-line text-[#e8a000] text-xs" />
                Your money is safe until you confirm delivery
              </p>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors">
                <i className="ri-shopping-cart-line" /> Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
