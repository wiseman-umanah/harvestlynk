"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeLeft, fadeRight, staggerContainer, fadeUp } from "@/lib/motion";

const benefits = [
  { icon: "ri-global-line", text: "Reach a wider audience across the nation, bypassing traditional middlemen to maximize your profits." },
  { icon: "ri-secure-payment-line", text: "Guaranteed payments through our secure escrow, ensuring you get paid for every successful delivery." },
  { icon: "ri-map-pin-line", text: "Access AI diagnostic tools that help you monitor crop health and ensure your produce is market-ready." },
];

export default function ForFarmers() {
  return (
    <section id="for-farmers" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          className="bg-[#1e5631] rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Text */}
            <motion.div
              className="p-10 md:p-14 flex flex-col justify-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white mb-8">
                Empowering Farmers
              </motion.h2>
              <ul className="space-y-5 mb-10">
                {benefits.map((b, i) => (
                  <motion.li
                    key={b.text}
                    variants={fadeLeft}
                    custom={i}
                    className="flex items-start gap-3"
                  >
                    <motion.i
                      className={`${b.icon} text-[#e8a000] text-lg mt-0.5 flex-shrink-0`}
                      whileHover={{ scale: 1.3, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                    <p className="text-green-100 text-sm leading-relaxed">{b.text}</p>
                  </motion.li>
                ))}
              </ul>
              <motion.a
                variants={fadeUp}
                href="#"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center justify-center w-fit px-6 py-3 rounded-full bg-[#e8a000] text-white font-medium hover:bg-[#d09000] transition-colors"
              >
                Start Selling
              </motion.a>
            </motion.div>

            {/* Image */}
            <motion.div
              className="relative min-h-64 md:min-h-0"
              variants={fadeRight}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              <Image src="/farmers.png" alt="Farmers at work" fill className="object-cover object-center" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
