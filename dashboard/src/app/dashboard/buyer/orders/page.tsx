"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { scaleIn } from "@/lib/motion";

export default function BuyerOrders() {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-md mx-auto"
    >
      {/* Circular image placeholder */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
        className="w-52 h-52 rounded-full bg-center bg-no-repeat bg-cover relative"
        style={{ backgroundImage: "url(/no_order.png)" }}
      >
        <div className="absolute inset-0 bg-stone-400/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white flex items-center justify-center z-10">
          <i className="ri-shopping-cart-2-line text-3xl text-[#0D631B] line-through" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-gray-900 mb-2"
      >
        No orders yet
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="text-gray-400 text-sm leading-relaxed mb-8"
      >
        Discover fresh produce from verified farmers and start your first secure escrow transaction.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/dashboard/buyer/marketplace"
            className="px-8 py-3 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors"
          >
            Browse Marketplace
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
