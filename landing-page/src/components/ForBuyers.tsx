"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeLeft, fadeRight, staggerContainer, fadeUp } from "@/lib/motion";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const benefits = [
  { icon: "ri-map-pin-2-line", text: "Transparent tracking from farm to warehouse, so you know exactly where your supply is at all times." },
  { icon: "ri-checkbox-circle-line", text: "AI-verified produce quality ensures you receive exactly what you paid for, reducing waste and disputes." },
  { icon: "ri-shield-check-line", text: "Complete peace of mind with escrow protection—your money is only released when you're satisfied." },
];

export default function ForBuyers() {
  return (
    <section id="for-buyers" className="bg-white py-10 pb-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          className="border border-gray-100 rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <motion.div
              className="relative min-h-64 md:min-h-0"
              variants={fadeLeft}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              <Image src="/marketer.png" alt="Buyers at market" fill className="object-cover object-center" />
            </motion.div>

            {/* Text */}
            <motion.div
              className="p-10 md:p-14 flex flex-col justify-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                Secure Sourcing for Buyers
              </motion.h2>
              <ul className="space-y-5 mb-10">
                {benefits.map((b, i) => (
                  <motion.li
                    key={b.text}
                    variants={fadeRight}
                    custom={i}
                    className="flex items-start gap-3"
                  >
                    <motion.i
                      className={`${b.icon} text-[#1e5631] text-lg mt-0.5 flex-shrink-0`}
                      whileHover={{ scale: 1.3, rotate: -10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                    <p className="text-gray-500 text-sm leading-relaxed">{b.text}</p>
                  </motion.li>
                ))}
              </ul>
              <motion.a
                variants={fadeUp}
                href={`${APP_URL}/signup/buyer`}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center justify-center w-fit px-6 py-3 rounded-full bg-[#1e5631] text-white font-medium hover:bg-[#174a28] transition-colors"
              >
                Browse Marketplace
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
