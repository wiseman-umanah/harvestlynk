"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import ListProductModal from "@/components/ListProductModal";

export default function MyFarm() {
  const [showModal, setShowModal] = useState(false);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {showModal && <ListProductModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Farm</h1>
          <p className="text-[#40493D] mt-1">Manage your agricultural inventory and verified listings.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-medium hover:bg-[#0a4f15] transition-colors self-start sm:self-auto"
        >
          <i className="ri-add-line" /> List New Product
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={staggerContainer}
      >
        {[
          { icon: "ri-box-3-line", iconBg: "bg-green-100", iconColor: "text-[#0D631B]", label: "Total Active Listings", value: "14 Items" },
          { icon: "ri-currency-line", iconBg: "bg-amber-100", iconColor: "text-amber-600", label: "Total Value of Inventory", value: "₦4,250,000" },
          { icon: "ri-shield-line", iconBg: "bg-blue-100", iconColor: "text-blue-600", label: "Pending Verification", value: "3 Pending" },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={scaleIn}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl p-5 md:p-8 border border-gray-100 flex items-center gap-4 bg-white"
          >
            <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <i className={`${s.icon} ${s.iconColor} text-xl`} />
            </div>
            <div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-gray-900 font-bold text-xl mt-0.5">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Active Listings */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Listings</h2>
          <a href="#" className="text-sm text-[#0D631B] font-medium hover:underline flex items-center gap-1">
            View All <i className="ri-arrow-right-s-line" />
          </a>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          variants={staggerContainer}
        >
          {[
            { name: "Organic Cassava Tubers", price: "₦15,000 / Bag", stock: "45 Bags Left", age: "2d ago", status: "VERIFIED", statusBg: "bg-[#0D631B]", action: "Edit", actionStyle: "border border-gray-200 text-gray-700 hover:bg-gray-50", bg: "from-amber-100 to-amber-200", icon: "ri-leaf-line text-amber-600" },
            { name: "Premium Cocoa Beans", price: "₦85,000 / 50kg Bag", stock: "12 Bags Left", age: "5d ago", status: "VERIFIED", statusBg: "bg-[#0D631B]", action: "Edit", actionStyle: "border border-gray-200 text-gray-700 hover:bg-gray-50", bg: "from-brown-100 to-stone-200", icon: "ri-seedling-line text-stone-600" },
            { name: "Yellow Grain Maize", price: "₦22,000 / Quintal", stock: "120 Units", age: "1w ago", status: "VERIFIED", statusBg: "bg-[#0D631B]", action: "Edit", actionStyle: "border border-gray-200 text-gray-700 hover:bg-gray-50", bg: "from-yellow-100 to-yellow-200", icon: "ri-plant-line text-yellow-600" },
            { name: "Large Red Onions", price: "₦12,500 / Mesh", stock: "0 Units", age: "Not Listed", status: "DRAFT", statusBg: "bg-gray-400", action: "Resume Listing", actionStyle: "bg-[#e8a000] text-white hover:bg-[#d09000]", bg: "from-red-100 to-red-200", icon: "ri-plant-line text-red-600" },
          ].map((item) => (
            <motion.div
              key={item.name}
              variants={scaleIn}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            >
              <div className={`relative h-40 bg-gradient-to-br ${item.bg} flex items-center justify-center`}>
                <div className={`absolute top-2 right-2 flex items-center gap-1 ${item.statusBg} text-white text-xs px-2 py-0.5 rounded-full`}>
                  {item.status === "VERIFIED" && <><i className="ri-checkbox-circle-fill text-xs" /> VERIFIED</>}
                  {item.status === "DRAFT" && "DRAFT"}
                </div>
                {item.status === "VERIFIED" && (
                  <div className="absolute top-7 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">ON MARKET</div>
                )}
                <i className={`${item.icon} text-4xl`} />
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.name}</p>
                <p className="text-[#0D631B] text-xs font-medium mb-1">{item.price}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><i className="ri-inbox-archive-line" />{item.stock}</span>
                  <span className="flex items-center gap-1"><i className="ri-calendar-line" />{item.age}</span>
                </div>
                <button className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${item.actionStyle}`}>
                  {item.action}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Drafts & Pending */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Drafts & Pending</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">3 Actions Needed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-gray-400 text-xs">
                <th className="text-left px-4 md:px-6 py-3 font-medium">Product</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Date Created</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Status</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">AI Verification</th>
                <th className="text-left px-4 md:px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  icon: "ri-drop-line", iconBg: "bg-red-100", iconColor: "text-red-500",
                  name: "Premium Red Palm Oil", date: "Oct 12, 2023",
                  status: "PENDING", statusStyle: "bg-blue-100 text-blue-700", statusIcon: "ri-loader-4-line",
                  verif: "progress", action: "View Status",
                },
                {
                  icon: "ri-seedling-line", iconBg: "bg-amber-100", iconColor: "text-amber-600",
                  name: "Dried Split Ginger", date: "Oct 11, 2023",
                  status: "DRAFT", statusStyle: "bg-gray-100 text-gray-600", statusIcon: null,
                  verif: "rejected", action: "Re-upload",
                },
              ].map((row, i) => (
                <motion.tr
                  key={row.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${row.iconBg} flex items-center justify-center`}>
                        <i className={`${row.icon} ${row.iconColor}`} />
                      </div>
                      <span className="font-medium text-gray-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-gray-500">{row.date}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${row.statusStyle}`}>
                      {row.statusIcon && <i className={row.statusIcon} />} {row.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    {row.verif === "progress" ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0D631B] rounded-full" style={{ width: "85%" }} />
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">85% Complete</span>
                      </div>
                    ) : (
                      <span className="text-red-500 text-xs flex items-center gap-1">
                        <i className="ri-close-circle-line" /> Image Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <button className="text-[#0D631B] font-medium text-sm hover:underline">{row.action}</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
