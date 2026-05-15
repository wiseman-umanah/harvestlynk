"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    title: "New Order #8291 received",
    dot: true,
    time: "2 mins ago",
    body: "A buyer from Lagos has just ordered 50kg of Grade A Cashew Nuts. Accept the order to initiate the escrow process.",
    actions: [
      { label: "View Order", style: "bg-[#0D631B] text-white hover:bg-[#0a4f15]" },
      { label: "Dismiss", style: "border border-gray-200 text-gray-700 hover:bg-gray-50" },
    ],
  },
  {
    id: 2,
    tab: ["All", "Payments"],
    icon: "ri-bank-card-line",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Escrow funds released for Order #7742",
    dot: false,
    time: "1 hour ago",
    body: "The buyer has confirmed receipt of the goods. ₦145,000.00 has been transferred to your connected bank account.",
    escrowLink: true,
  },
  {
    id: 3,
    tab: ["All", "System"],
    icon: "ri-shield-check-line",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Profile verification complete",
    dot: false,
    time: "Yesterday",
    body: "Congratulations! Your farm has been verified. You now have the 'Verified Farmer' badge and can handle high-value escrow transactions.",
  },
  {
    id: 4,
    tab: ["All", "System"],
    icon: "ri-user-add-line",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Welcome",
    dot: false,
    time: "Yesterday",
    body: "Congratulations! welcome to harvestlynk",
  },
  {
    id: 5,
    tab: ["All", "Payments"],
    icon: "ri-file-list-3-line",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
    title: "Payout successful",
    dot: false,
    time: "3 days ago",
    body: "Your weekly payout of ₦34,200.00 has been credited to your First Bank account ending in 0981.",
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

export default function FarmerNotifications() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    setUnverified(localStorage.getItem("hl_farmer_verified") === "false");
  }, []);

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
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your farm&apos;s activities and transactions.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <i className="ri-check-double-line" /> Mark all as read
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Verification banner */}
      {unverified && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-line text-amber-600 text-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Account verification pending</p>
              <p className="text-xs text-amber-600 mt-0.5">Complete identity &amp; farm verification to unlock full marketplace access.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/onboard/farmer")}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Complete Verification
          </motion.button>
        </motion.div>
      )}

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
