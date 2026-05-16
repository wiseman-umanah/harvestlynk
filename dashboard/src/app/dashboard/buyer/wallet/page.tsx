"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";
import { walletApi, formatNaira, Transaction } from "@/lib/api";

export default function BuyerWallet() {
  const { wallet, refreshWallet } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    refreshWallet();
    walletApi.getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, [refreshWallet]);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Balance card */}
      <motion.div
        variants={scaleIn}
        whileHover={{ scale: 1.01 }}
        className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-100">
          <i className="ri-shield-line text-[80px] md:text-[120px]" />
        </div>
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Available Balance</p>
        <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
          {wallet ? formatNaira(wallet.available_balance) : "₦0.00"}{" "}
          <span className="text-base md:text-lg font-medium text-gray-400">NGN</span>
        </p>
        {wallet && parseInt(wallet.pending_balance, 10) > 0 && (
          <p className="text-amber-600 text-xs mb-1 flex items-center gap-1">
            <i className="ri-lock-line" /> {formatNaira(wallet.pending_balance)} held in escrow
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a000] text-white font-medium text-sm hover:bg-[#d09000] transition-colors"
          >
            <i className="ri-bank-card-line" /> Credit Wallet
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#0D631B] text-[#0D631B] font-medium text-sm hover:bg-green-50 transition-colors"
          >
            Withdraw Funds
          </motion.button>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-[#0D631B] text-2xl" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <i className="ri-file-list-3-line text-3xl mb-2" />
            <p className="text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 md:px-6 py-3">Date</th>
                  <th className="text-left px-4 md:px-6 py-3">Description</th>
                  <th className="text-left px-4 md:px-6 py-3">Type</th>
                  <th className="text-left px-4 md:px-6 py-3">Amount</th>
                  <th className="text-left px-4 md:px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <motion.tr
                    key={t.transaction_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("en-NG", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {t.description ?? (t.reference_type
                          ? `${t.reference_type} #${t.reference_id?.slice(0, 8)}`
                          : "Transaction")}
                      </p>
                    </td>
                    <td className={`px-4 md:px-6 py-4 text-sm font-semibold ${
                      t.type === "credit" ? "text-[#0D631B]" : "text-red-500"
                    }`}>
                      {t.type === "credit" ? "Credit" : "Debit"}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {t.type === "debit" ? "-" : "+"}{formatNaira(t.amount)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        t.status === "completed" ? "bg-green-100 text-[#0D631B]" :
                        t.status === "pending"   ? "bg-blue-50 text-blue-600" :
                                                   "bg-red-50 text-red-500"
                      }`}>
                        {t.status === "pending" && <i className="ri-lock-line" />}
                        {t.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
