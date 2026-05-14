"use client";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, fadeLeft, fadeRight } from "@/lib/motion";

const steps = [
  {
    icon: "ri-sparkling-2-line",
    title: "AI-Powered Verification",
    description:
      "Our proprietary AI scan feature allows farmers to verify the quality and health of their goods before listing. This ensures only top-tier produce reaches the market, maintaining high standards for every transaction.",
  },
  {
    icon: "ri-safe-line",
    title: "Escrow Protection",
    description:
      "No more payment risks. Buyers' funds are held safely in our secure escrow system and are only released to the farmer once delivery and quality are confirmed by the buyer.",
  },
];

const stepVariants = [fadeLeft, fadeRight];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How Harvestlynk Works
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 max-w-lg mx-auto">
            A seamless, dual-sided marketplace designed to bring trust and
            efficiency to Nigerian agriculture.
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              variants={stepVariants[i]}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl p-8 border border-gray-100 cursor-default"
            >
              <motion.div
                className="w-11 h-11 rounded-xl bg-[#e8f5e9] flex items-center justify-center mb-5"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
              >
                <i className={`${s.icon} text-[#1e5631] text-2xl`} />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
