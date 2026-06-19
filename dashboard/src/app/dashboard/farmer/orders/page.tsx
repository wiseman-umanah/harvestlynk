"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { ordersApi, type FarmerOrder } from "@/lib/api";

const STATUS_CONFIG: Record<
  FarmerOrder["status"],
  { label: string; style: string; icon: string }
> = {
  pending_payment:   { label: "Awaiting Payment",   style: "bg-red-100 text-red-700",       icon: "ri-time-line" },
  payment_confirmed: { label: "Payment Confirmed",  style: "bg-blue-100 text-blue-700",     icon: "ri-secure-payment-line" },
  processing:        { label: "Payment Secured",    style: "bg-blue-100 text-blue-700",     icon: "ri-lock-line" },
  ready_for_pickup:  { label: "Ready for Pickup",   style: "bg-purple-100 text-purple-700", icon: "ri-store-2-line" },
  completed:         { label: "Funds Released",     style: "bg-green-100 text-green-700",   icon: "ri-checkbox-circle-line" },
  cancelled:         { label: "Cancelled",          style: "bg-gray-100 text-gray-600",     icon: "ri-close-circle-line" },
  disputed:          { label: "Disputed",           style: "bg-orange-100 text-orange-700", icon: "ri-alert-line" },
};

const AVATAR_COLORS = [
  "bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-400",
  "bg-rose-500", "bg-teal-500", "bg-indigo-500", "bg-orange-500",
];

function avatarColor(str: string) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function relativeDate(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "1d ago";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

const ADVANCE_LABEL: Partial<Record<FarmerOrder["status"], string>> = {
  payment_confirmed: "Mark Processing",
  processing: "Mark Ready",
};

type Tab = "all" | "active" | "completed";

export default function Orders() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getMyFarmerOrders();
      setOrders(data);
    } catch {
      // empty state will handle it
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleAdvance(orderId: string) {
    setAdvancingId(orderId);
    try {
      const { status } = await ordersApi.updateStatus(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: status as FarmerOrder["status"] } : o))
      );
    } catch {
      // silently fail — order stays as-is
    } finally {
      setAdvancingId(null);
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
      o.order_id.toLowerCase().includes(q) ||
      o.listing.product_name.toLowerCase().includes(q) ||
      o.buyer.name.toLowerCase().includes(q);

    return matchTab && matchSearch;
  });

  const counts = {
    all: orders.length,
    active: orders.filter((o) => o.status === "processing" || o.status === "pending_payment").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500 mt-1">Track and manage your agricultural trades and logistics.</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders",     value: loading ? "—" : orders.length,          bg: "bg-white",       text: "text-gray-900" },
          { label: "Active",           value: loading ? "—" : counts.active,          bg: "bg-blue-50",     text: "text-blue-700" },
          { label: "Completed",        value: loading ? "—" : counts.completed,        bg: "bg-green-50",    text: "text-[#0D631B]" },
          { label: "Cancelled",        value: loading ? "—" : orders.filter(o => o.status === "cancelled").length, bg: "bg-gray-50", text: "text-gray-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters + Search */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "completed"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize flex items-center gap-1.5
                ${tab === t ? "bg-[#0D631B] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "all" ? "All Orders" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {loading ? "—" : counts[t]}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, produce, or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-full focus:outline-none focus:border-[#0D631B]"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            <i className="ri-loader-4-line animate-spin text-xl mr-2" /> Loading orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <i className="ri-inbox-line text-3xl mb-2" />
            <p className="text-sm font-medium">
              {orders.length === 0 ? "No orders yet" : "No orders match your filter"}
            </p>
            {orders.length === 0 && (
              <p className="text-xs mt-1">Orders from buyers will appear here once you have active listings.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs">
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Order ID</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Buyer</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Produce</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Total (₦)</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Delivery</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Date</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((o, i) => {
                  const st = STATUS_CONFIG[o.status];
                  const color = avatarColor(o.buyer.name);
                  return (
                    <motion.tr
                      key={o.order_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 md:px-6 py-4 font-mono text-[#0D631B] text-xs font-medium">
                        #{o.order_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                            {initials(o.buyer.name)}
                          </div>
                          <span className="text-gray-700">{o.buyer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-600">{o.listing.product_name}</td>
                      <td className="px-4 md:px-6 py-4 text-gray-700">
                        {parseFloat(o.quantity)} {o.listing.unit}
                      </td>
                      <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">
                        ₦{o.total_amount.toLocaleString("en-NG")}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-500 capitalize text-xs">
                        {o.delivery_method.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${st.style}`}>
                          <i className={st.icon} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-gray-400 text-xs">
                        {relativeDate(o.created_at)}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        {ADVANCE_LABEL[o.status] && (
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleAdvance(o.order_id)}
                            disabled={advancingId === o.order_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D631B] text-white text-xs font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60 whitespace-nowrap"
                          >
                            {advancingId === o.order_id
                              ? <><i className="ri-loader-4-line animate-spin" /> Updating...</>
                              : <><i className="ri-arrow-right-circle-line" /> {ADVANCE_LABEL[o.status]}</>
                            }
                          </motion.button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 md:px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
