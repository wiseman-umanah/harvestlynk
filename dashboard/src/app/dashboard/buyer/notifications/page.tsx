"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion";

type Tab = "All" | "Orders" | "Payments" | "System";

const notifications = [
  {
    id: 1,
    tab: ["All", "Orders"],
    icon: "ri-shopping-bag-3-line",
    iconBg: "bg-[#0D631B]",
    iconColor: "text-white",
    title: "Order #8291 confirmed",
    dot: true,
    time: "2 mins ago",
    body: "Your order of 50kg Grade A Cashew Nuts has been accepted by the farmer. Payment is now held securely in escrow.",
    actions: [
      { label: "View Order", style: "bg-[#0D631B] text-white hover:bg-[#0a4f15]" },
      { label: "Dismiss", style: "border border-gray-200 text-gray-700 hover:bg-gray-50" },
    ],
  },
  {
    id: 2,
    tab: ["All", "Orders"],
    icon: "ri-truck-line",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Order #8105 is in transit",
    dot: true,
    time: "45 mins ago",
    body: "Your delivery of Hybrid Maize (10 Bags) has been dispatched. Expected delivery in 2–3 business days.",
    actions: [
      { label: "Track Order", style: "bg-[#0D631B] text-white hover:bg-[#0a4f15]" },
      { label: "Dismiss", style: "border border-gray-200 text-gray-700 hover:bg-gray-50" },
    ],
  },
  {
    id: 3,
    tab: ["All", "Payments"],
    icon: "ri-bank-card-line",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Escrow payment initiated for Order #8291",
    dot: false,
    time: "1 hour ago",
    body: "₦62,500.00 has been held in escrow for your order. Funds will be released to the farmer once you confirm receipt.",
    escrowLink: true,
  },
  {
    id: 4,
    tab: ["All", "System"],
    icon: "ri-shield-check-line",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Account verified",
    dot: false,
    time: "Yesterday",
    body: "Your buyer account has been verified. You can now place high-value orders and access exclusive produce listings.",
  },
  {
    id: 5,
    tab: ["All", "System"],
    icon: "ri-user-add-line",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Welcome",
    dot: false,
    time: "Yesterday",
    body: "Congratulations! Welcome to Harvestlynk. Start exploring fresh produce from verified farmers near you.",
  },
  {
    id: 6,
    tab: ["All", "Payments"],
    icon: "ri-file-list-3-line",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
    title: "Payment receipt for Order #7998",
    dot: false,
    time: "3 days ago",
    body: "Your payment of ₦28,000.00 for Red Pepper (5 Crates) has been confirmed and released to the farmer.",
    earlier: true,
  },
];

const TABS: Tab[] = ["All", "Orders", "Payments", "System"];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.07 },
  }),
};

export default function BuyerNotifications() {
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const filtered = notifications.filter((n) => n.tab.includes(activeTab));
  const recent = filtered.filter((n) => !n.earlier);
  const earlier = filtered.filter((n) => n.earlier);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your orders and transactions.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors"
        >
          <i className="ri-check-double-line" /> Mark all as read
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* Notification list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {recent.map((n, i) => (
            <motion.div
              key={n.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex gap-4">
                <div className={`w-11 h-11 rounded-full ${n.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <i className={`${n.icon} ${n.iconColor} text-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      {n.dot && <span className="w-2 h-2 rounded-full bg-[#0D631B] flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{n.time}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">{n.body}</p>
                  {n.escrowLink && (
                    <p className="text-[#0D631B] text-sm font-medium flex items-center gap-1 mb-3">
                      <i className="ri-lock-line" /> Securely processed via Escrow
                    </p>
                  )}
                  {n.actions && (
                    <div className="flex items-center gap-2">
                      {n.actions.map((a) => (
                        <motion.button
                          key={a.label}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${a.style}`}
                        >
                          {a.label}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {earlier.length > 0 && (
          <>
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Earlier this week</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {earlier.map((n, i) => (
              <motion.div
                key={n.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex gap-4">
                  <div className={`w-11 h-11 rounded-full ${n.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${n.icon} ${n.iconColor} text-lg`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{n.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
