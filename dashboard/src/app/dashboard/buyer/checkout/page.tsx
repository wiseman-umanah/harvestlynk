"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── Data ───────────────────────────────────────────────────────────────────

const shipments = [
  {
    farmer: "Kaduna Roots Coop",
    location: "Kaduna State",
    icon: "ri-seedling-line",
    items: [
      { name: "Large Yam Tubers (50kg)", qty: 1, price: 35500, img: null, icon: "ri-plant-line", estimate: "Oct 24 - Oct 27", shipping: 3000 },
    ],
  },
  {
    farmer: "Green Valley Farm",
    location: "Jos, Plateau",
    icon: "ri-store-2-line",
    items: [
      { name: "Fresh Habanero Peppers (5kg)", qty: 2, price: 12000, img: null, icon: "ri-leaf-line", estimate: "Oct 22 - Oct 25", shipping: 1500 },
    ],
  },
];

const SUBTOTAL = 47500;
const SHIPPING = 4500;
const SERVICE_FEE = 500;
const TOTAL = SUBTOTAL + SHIPPING + SERVICE_FEE;

const ORDER_NUMBER = "#FC-99210";

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Shipping", "Payment", "Review"];
  return (
    <div className="overflow-x-auto mb-8">
      <div className="flex items-center min-w-fit">
        {steps.map((label, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0
                    ${done || active ? "bg-[#0D631B] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  {done ? <i className="ri-check-line text-sm" /> : idx}
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap ${active || done ? "text-[#0D631B]" : "text-gray-400"}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-16 h-px mx-2 sm:mx-3 flex-shrink-0 ${step > idx ? "bg-[#0D631B]" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Summary sidebar ───────────────────────────────────────────────────

function OrderSummary({ step, onProceed, label }: { step: number; onProceed: () => void; label: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-2.5 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span>{step === 3 ? "Subtotal (3 items)" : "Items Subtotal"}</span>
            <span>₦{SUBTOTAL.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{step === 3 ? "Aggregated Shipping" : "Total Shipping"}</span>
            <span>₦{(step === 3 ? 3500 : SHIPPING).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="flex items-center gap-1">
              {step === 3 ? "Processing Fee" : "Service Fee"}
              <i className="ri-information-line text-gray-400 text-xs" />
            </span>
            <span>₦{(step === 3 ? 450 : SERVICE_FEE).toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="font-bold text-gray-900">{step === 3 ? "Grand Total" : "Total"}</span>
            <span className="text-2xl font-bold text-[#0D631B]">
              ₦{(step === 3 ? 24850 : TOTAL).toLocaleString()}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onProceed}
          className="w-full py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4f15] transition-colors flex items-center justify-center gap-2"
        >
          {label} <i className="ri-arrow-right-line" />
        </motion.button>

        <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
          <i className="ri-shield-check-line text-[#0D631B]" /> Secured by AgroTrust Escrow
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-gray-300">
          <i className="ri-bank-card-line text-lg" />
          <i className="ri-exchange-line text-lg" />
          <i className="ri-shield-line text-lg" />
        </div>
      </div>

      {/* AgroDirect Promise */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 text-sm">
        <p className="font-semibold text-[#0D631B] flex items-center gap-1.5 mb-1">
          <i className="ri-information-line" /> AgroDirect Promise
        </p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Your payment is held in escrow. Funds are only released to farmers after you confirm the quality of your produce.
        </p>
      </div>

      {step === 2 && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Shipment Origin</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center flex-shrink-0">
              <i className="ri-user-line text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Farmer Adebayo</p>
              <p className="text-xs text-gray-400 flex items-center gap-1"><i className="ri-map-pin-line" /> Ibadan, Nigeria</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Shipping ────────────────────────────────────────────────────────

function StepShipping({ onNext }: { onNext: () => void }) {
  const [delivery, setDelivery] = useState<"standard" | "priority">("standard");

  return (
    <div className="space-y-5">
      {/* Shipping info form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <i className="ri-truck-line text-[#0D631B]" /> Shipping Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Chidi Okoro"
              defaultValue="Chidi Okoro"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
            <input
              type="tel"
              placeholder="+234 000 000 0000"
              defaultValue="+234 810 000 0000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Address</label>
          <textarea
            placeholder="Enter your full house address"
            defaultValue="123 Agribiz Road, Ikeja, Lagos"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#0D631B] focus:bg-white resize-none"
          />
        </div>
      </div>

      {/* Delivery method */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Delivery Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "standard", label: "Standard Delivery", sub: "3-5 Business Days" },
            { id: "priority", label: "Priority Pickup", sub: "Available at local hub in 24h" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setDelivery(m.id as "standard" | "priority")}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors
                ${delivery === m.id ? "border-[#0D631B] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${delivery === m.id ? "border-[#0D631B]" : "border-gray-300"}`}>
                {delivery === m.id && <div className="w-2 h-2 rounded-full bg-[#0D631B]" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${delivery === m.id ? "text-[#0D631B]" : "text-gray-800"}`}>{m.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Your Shipments */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Your Shipments</h3>
        <div className="space-y-3">
          {shipments.map((s) => (
            <div key={s.farmer} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                  <i className={`${s.icon} text-[#0D631B]`} /> {s.farmer}
                </div>
                <span className="px-3 py-1 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">{s.location}</span>
              </div>
              {s.items.map((item) => (
                <div key={item.name} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center flex-shrink-0">
                      <i className={`${item.icon} text-stone-500 text-2xl`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Quantity: {item.qty}</p>
                      <p className="text-[#0D631B] font-bold text-sm mt-1">₦{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="sm:ml-auto sm:text-right flex sm:flex-col items-center sm:items-end justify-between flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Estimate</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{item.estimate}</p>
                      <p className="text-xs text-[#0D631B] mt-0.5">Shipping: ₦{item.shipping.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Payment ─────────────────────────────────────────────────────────

function StepPayment() {
  const [selected, setSelected] = useState<"wallet" | "bank" | "card">("wallet");

  const methods: {
    id: "wallet" | "bank" | "card";
    icon: string;
    label: string;
    sub: string | null;
    badge?: string;
    cards?: boolean;
  }[] = [
    {
      id: "wallet",
      icon: "ri-wallet-3-line",
      label: "HarvestLynk Wallet",
      sub: "Current Balance: ₦60,000.00",
      badge: "RECOMMENDED",
    },
    {
      id: "bank",
      icon: "ri-bank-line",
      label: "Bank Transfer",
      sub: "Instant verification via automated secure portal.",
    },
    {
      id: "card",
      icon: "ri-bank-card-line",
      label: "Credit/Debit Card",
      sub: null,
      cards: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Payment Method</h2>
        <p className="text-gray-400 text-sm mt-1">Choose how you want to settle your agrarian trade securely.</p>
      </div>

      <div className="space-y-3">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-colors
              ${selected === m.id ? "border-[#0D631B] bg-green-50/30" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              ${selected === m.id ? "bg-[#0D631B] text-white" : "bg-gray-100 text-gray-500"}`}>
              <i className={`${m.icon} text-lg`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                {m.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">{m.badge}</span>
                )}
              </div>
              {m.sub && <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>}
              {m.cards && (
                <div className="flex gap-1.5 mt-1">
                  <div className="w-8 h-5 rounded bg-blue-700" />
                  <div className="w-8 h-5 rounded bg-blue-500" />
                  <div className="w-8 h-5 rounded bg-blue-900" />
                </div>
              )}
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${selected === m.id ? "border-[#0D631B]" : "border-gray-300"}`}>
              {selected === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#0D631B]" />}
            </div>
          </button>
        ))}
      </div>

      {/* Escrow notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border-l-4 border-[#0D631B] bg-green-50">
        <i className="ri-shield-check-line text-[#0D631B] text-lg flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#0D631B]">Harvestlynk Escrow Protection</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            Your funds will be held in escrow and only released to farmers after you confirm receipt of goods. This ensures full transparency and trade security.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Review ──────────────────────────────────────────────────────────

function StepReview({ onConfirm }: { onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false);

  const reviewShipments = [
    {
      farmer: "Green Valley Organics",
      location: "Ibadan, OYO",
      shipment: "Shipment 1 of 2",
      icon: "ri-seedling-line",
      items: [{ name: "Organic Baby Spinach", sub: "5kg Bulk Pack", price: 12500, qty: 1, img: null, icon: "ri-leaf-line" }],
    },
    {
      farmer: "Olu's Poultry & Grains",
      location: "Abeokuta, OGUN",
      shipment: "Shipment 2 of 2",
      icon: "ri-store-2-line",
      items: [{ name: "Crate of Golden Yolk Eggs", sub: "30 Large Eggs", price: 4200, qty: 2, img: null, icon: "ri-store-line" }],
    },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">Review & Confirm Order</h2>

      {/* Shipping + Payment summary row */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-bold text-[#0D631B] flex items-center gap-1.5 mb-2">
            <i className="ri-truck-line" /> Shipping Address
          </p>
          <p className="text-sm text-gray-700">123 Agribiz Road, Ikeja, Lagos</p>
          <button className="text-xs text-[#0D631B] font-semibold mt-1 hover:underline">Change</button>
        </div>
        <div className="sm:border-l sm:border-gray-100 sm:pl-4">
          <p className="text-sm font-bold text-[#0D631B] flex items-center gap-1.5 mb-2">
            <i className="ri-bank-card-line" /> Payment Method
          </p>
          <p className="text-sm text-gray-700">HarvestLynk Wallet (Ending in ...889)</p>
          <button className="text-xs text-[#0D631B] font-semibold mt-1 hover:underline">Change</button>
        </div>
      </div>

      {/* Shipment groups */}
      <div className="space-y-3">
        {reviewShipments.map((s) => (
          <div key={s.farmer} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                <i className={`${s.icon} text-[#0D631B]`} /> {s.farmer}
                <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">{s.location}</span>
              </div>
              <span className="text-xs text-gray-400">{s.shipment}</span>
            </div>
            {s.items.map((item) => (
              <div key={item.name} className="px-5 py-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                  <i className={`${item.icon} text-green-600 text-2xl`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">₦{item.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.qty}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Escrow agreement */}
      <label className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-[#0D631B] w-4 h-4 flex-shrink-0"
        />
        <span className="text-xs text-gray-600 leading-relaxed">
          I agree to the{" "}
          <span className="text-[#0D631B] font-semibold">HarvestLynk Escrow Protection terms</span>
          . My payment will be held securely and only released to the farmers after I confirm receipt of the items.
        </span>
      </label>
    </div>
  );
}

// ─── Step 4: Success ─────────────────────────────────────────────────────────

function StepSuccess() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center py-8"
    >
      {/* Check circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
        className="w-20 h-20 rounded-full bg-[#0D631B] flex items-center justify-center mb-5"
      >
        <i className="ri-check-line text-white text-4xl" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl md:text-3xl font-bold text-[#0D631B] mb-3"
      >
        Order Placed Successfully!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-500 text-sm mb-5 max-w-sm"
      >
        Your payment of <span className="font-bold text-gray-800">₦52,500</span> is now held securely in escrow.{" "}
        Farmers have been notified to begin fulfillment.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center gap-3 border border-gray-200 rounded-xl px-5 py-3 mb-7"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Number:</span>
        <span className="text-sm font-bold text-gray-900">{ORDER_NUMBER}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mb-10"
      >
        <Link
          href="/dashboard/buyer/orders"
          className="px-8 py-3 rounded-xl bg-[#0D631B] text-white font-semibold text-sm hover:bg-[#0a4f15] transition-colors"
        >
          Track Order Status
        </Link>
        <Link
          href="/dashboard/buyer/marketplace"
          className="px-8 py-3 rounded-xl border-2 border-[#0D631B] text-[#0D631B] font-semibold text-sm hover:bg-green-50 transition-colors"
        >
          Return to Marketplace
        </Link>
      </motion.div>

      {/* Escrow steps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">How Your Secure Escrow Works</h3>
            <p className="text-xs text-gray-400 mt-1">Your funds are protected by AgroDirect until you confirm quality delivery.</p>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-[#0D631B] text-xs font-semibold">
            <i className="ri-shield-check-line" /> AgroTrust Verified
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "ri-safe-line", step: 1, label: "Payment Held", desc: "Funds secured in escrow vault.", active: true },
            { icon: "ri-store-2-line", step: 2, label: "Farmer Ships", desc: "Farmers pack and dispatch items.", active: false },
            { icon: "ri-gift-line", step: 3, label: "You Receive", desc: "Inspect your farm-fresh goods.", active: false },
            { icon: "ri-money-dollar-circle-line", step: 4, label: "Funds Released", desc: "Payment released to the farmer.", active: false },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex flex-col items-center text-center relative">
              {i < arr.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-[-50%] h-px bg-gray-200" />
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 relative z-10
                ${s.active ? "bg-green-100" : "bg-gray-100"}`}>
                <i className={`${s.icon} ${s.active ? "text-[#0D631B]" : "text-gray-400"} text-lg`} />
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Step {s.step}</p>
              <p className="text-sm font-bold text-gray-900 mb-1">{s.label}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [step, setStep] = useState(1);

  const summaryLabel =
    step === 1 ? "Proceed to Payment" :
    step === 2 ? `Pay ₦${TOTAL.toLocaleString()} Now` :
    "Confirm & Place Order";

  function handleProceed() {
    if (step < 3) setStep((s) => s + 1);
    else setStep(4);
  }

  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto">
        <StepSuccess />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepBar step={step} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left: step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 && <StepShipping onNext={handleProceed} />}
            {step === 2 && <StepPayment />}
            {step === 3 && <StepReview onConfirm={handleProceed} />}
          </motion.div>
        </AnimatePresence>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-6">
          <OrderSummary step={step} onProceed={handleProceed} label={summaryLabel} />
        </div>
      </div>
    </div>
  );
}
