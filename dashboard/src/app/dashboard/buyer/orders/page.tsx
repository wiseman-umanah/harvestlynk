"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { ordersApi, type BuyerOrder } from "@/lib/api";

const STATUS_CONFIG: Record<
  BuyerOrder["status"],
  { label: string; style: string; icon: string }
> = {
  pending_payment: { label: "Awaiting Payment",  style: "bg-red-100 text-red-700",     icon: "ri-time-line" },
  processing:      { label: "Secured in Escrow", style: "bg-blue-100 text-blue-700",   icon: "ri-lock-line" },
  completed:       { label: "Delivered",         style: "bg-green-100 text-green-700", icon: "ri-checkbox-circle-line" },
  cancelled:       { label: "Cancelled",         style: "bg-gray-100 text-gray-500",   icon: "ri-close-circle-line" },
  disputed:        { label: "Disputed",          style: "bg-orange-100 text-orange-700", icon: "ri-alert-line" },
};

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "all" | "active" | "completed";

export default function BuyerOrders() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getMyBuyerOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleConfirmDelivery(orderId: string) {
    setConfirmingId(orderId);
    try {
      await ordersApi.confirmDelivery(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: "completed" } : o)),
      );
    } catch {
      // silently fail — order state stays as-is
    } finally {
      setConfirmingId(null);
    }
  }

  const filtered = orders.filter((o) => {
    const matchTab =
      tab === "all" ? true :
      tab === "active" ? o.status === "processing" || o.status === "pending_payment" :
      o.status === "completed";
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.listing.product_name.toLowerCase().includes(q) ||
      o.farmer.name.toLowerCase().includes(q) ||
      o.order_id.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all: orders.length,
    active: orders.filter((o) => ["processing", "pending_payment"].includes(o.status)).length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your produce purchases.</p>
        </div>
        <Link
          href="/dashboard/buyer/marketplace"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors flex-shrink-0"
        >
          <i className="ri-add-line" /> New Order
        </Link>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders",  value: loading ? "—" : orders.length,                                           bg: "bg-white",      text: "text-gray-900" },
          { label: "Active",        value: loading ? "—" : counts.active,                                           bg: "bg-blue-50",    text: "text-blue-700" },
          { label: "Delivered",     value: loading ? "—" : counts.completed,                                        bg: "bg-green-50",   text: "text-[#0D631B]" },
          { label: "Total Spent",   value: loading ? "—" : `₦${orders.filter(o=>o.status==="completed").reduce((s,o)=>s+o.total_amount,0).toLocaleString("en-NG")}`,
                                    bg: "bg-amber-50", text: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters + Search */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "completed"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 capitalize
                ${tab === t ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                {loading ? "—" : counts[t]}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-full focus:outline-none focus:border-[#0D631B]"
          />
        </div>
      </motion.div>

      {/* Orders list */}
      <motion.div variants={fadeUp} className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin text-xl mr-2" /> Loading orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 text-gray-400">
            <i className="ri-inbox-line text-3xl mb-2" />
            <p className="text-sm font-medium">
              {orders.length === 0 ? "No orders yet" : "No orders match your filter"}
            </p>
            {orders.length === 0 && (
              <Link
                href="/dashboard/buyer/marketplace"
                className="mt-3 text-[#0D631B] text-sm font-semibold hover:underline"
              >
                Browse Marketplace
              </Link>
            )}
          </div>
        ) : (
          filtered.map((o, i) => {
            const st = STATUS_CONFIG[o.status];
            const isConfirming = confirmingId === o.order_id;
            return (
              <motion.div
                key={o.order_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <i className="ri-box-3-line text-stone-500 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">{o.listing.product_name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {parseFloat(o.quantity)} {o.listing.unit} · from {o.farmer.farmName ?? o.farmer.name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#0D631B]">
                          ₦{o.total_amount.toLocaleString("en-NG")}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">{relativeDate(o.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.style}`}>
                          <i className={st.icon} /> {st.label}
                        </span>
                        <span className="text-gray-400 text-xs capitalize">
                          <i className="ri-truck-line mr-1" />{o.delivery_method}
                        </span>
                        <span className="text-gray-400 text-xs font-mono">
                          #{o.order_id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      {o.status === "processing" && (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleConfirmDelivery(o.order_id)}
                          disabled={isConfirming}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D631B] text-white text-xs font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60"
                        >
                          {isConfirming
                            ? <><i className="ri-loader-4-line animate-spin" /> Confirming...</>
                            : <><i className="ri-checkbox-circle-line" /> Confirm Delivery</>
                          }
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
