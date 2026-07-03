"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, type CartItem } from "@/context/CartContext";
import { ordersApi } from "@/lib/api";

// Group cart items by farmer
function groupByFarmer(items: CartItem[]) {
  const groups: Record<string, { farmer_name: string; farm_name: string | null; location_state: string; items: CartItem[] }> = {};
  for (const item of items) {
    if (!groups[item.farmer_id]) {
      groups[item.farmer_id] = {
        farmer_name: item.farmer_name,
        farm_name: item.farm_name,
        location_state: item.location_state,
        items: [],
      };
    }
    groups[item.farmer_id].items.push(item);
  }
  return Object.entries(groups);
}

export default function CartPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, totalPrice } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<Record<string, "pickup" | "delivery">>({});
  const [deliveryAddress, setDeliveryAddress] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const groups = groupByFarmer(items);

  function getMethod(farmerId: string): "pickup" | "delivery" {
    return deliveryMethod[farmerId] ?? "pickup";
  }

  async function handlePlaceOrders() {
    setError("");

    // Validate delivery addresses
    for (const [farmerId] of groups) {
      if (getMethod(farmerId) === "delivery" && !deliveryAddress[farmerId]?.trim()) {
        setError("Please enter a delivery address for all shipments that require delivery.");
        return;
      }
    }

    setPlacing(true);
    const paymentWindow = typeof window !== "undefined" ? window.open("", "_blank") : null;
    try {
      let firstCheckoutLink: string | null = null;

      for (const item of items) {
        const farmerId = item.farmer_id;
        const method = getMethod(farmerId);
        const createdOrder = await ordersApi.createOrder({
          listing_id: item.listing_id,
          quantity: item.quantity,
          delivery_method: method,
          delivery_address: method === "delivery" ? deliveryAddress[farmerId] ?? null : null,
        });
        if (!firstCheckoutLink && createdOrder.checkout_link) {
          firstCheckoutLink = createdOrder.checkout_link;
        }
      }

      clearCart();
      if (firstCheckoutLink) {
        if (paymentWindow) {
          paymentWindow.location.href = firstCheckoutLink;
        } else {
          window.open(firstCheckoutLink, "_blank");
        }
      } else {
        if (paymentWindow) {
          paymentWindow.close();
        }
        setError("Orders were created, but the payment link could not be generated. Please visit your orders page to retry payment.");
      }
      router.push("/dashboard/buyer/orders");
    } catch (err) {
      if (paymentWindow) {
        paymentWindow.close();
      }
      setError(err instanceof Error ? err.message : "Failed to place orders. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="ri-shopping-cart-line text-3xl text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Browse the marketplace and add fresh produce to your cart.</p>
        <Link
          href="/dashboard/buyer/marketplace"
          className="px-6 py-3 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-gray-500 mt-1">{items.length} item{items.length !== 1 ? "s" : ""} from {groups.length} farmer{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:underline flex items-center gap-1"
        >
          <i className="ri-delete-bin-line" /> Clear Cart
        </button>
      </div>

      {/* Shipment groups */}
      <div className="space-y-4">
        {groups.map(([farmerId, group]) => {
          const method = getMethod(farmerId);
          const groupTotal = group.items.reduce(
            (s, i) => s + i.price_per_unit * i.quantity,
            0,
          );
          const hasDelivery = group.items.some((i) =>
            i.delivery_options.includes("delivery"),
          );

          return (
            <motion.div
              key={farmerId}
              layout
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* Farmer header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-store-2-line text-[#0D631B]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {group.farm_name ?? group.farmer_name}
                  </p>
                  <p className="text-gray-400 text-xs flex items-center gap-1">
                    <i className="ri-map-pin-line" /> {group.location_state}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                <AnimatePresence>
                  {group.items.map((item) => (
                    <motion.div
                      key={item.listing_id}
                      layout
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <i className="ri-box-3-line text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                        <p className="text-gray-400 text-xs">
                          ₦{item.price_per_unit.toLocaleString("en-NG")} / {item.unit}
                        </p>
                      </div>
                      {/* Qty control */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateQty(item.listing_id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          <i className="ri-subtract-line text-xs" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.listing_id, item.quantity + 1)}
                          disabled={item.quantity >= item.max_quantity}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >
                          <i className="ri-add-line text-xs" />
                        </button>
                      </div>
                      <p className="text-gray-900 font-semibold text-sm w-24 text-right flex-shrink-0">
                        ₦{(item.price_per_unit * item.quantity).toLocaleString("en-NG")}
                      </p>
                      <button
                        onClick={() => removeItem(item.listing_id)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <i className="ri-close-line" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Delivery options for this farmer */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600 font-medium">Delivery method:</p>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`method-${farmerId}`}
                        value="pickup"
                        checked={method === "pickup"}
                        onChange={() =>
                          setDeliveryMethod((p) => ({ ...p, [farmerId]: "pickup" }))
                        }
                        className="accent-[#0D631B]"
                      />
                      Pickup
                    </label>
                    {hasDelivery && (
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name={`method-${farmerId}`}
                          value="delivery"
                          checked={method === "delivery"}
                          onChange={() =>
                            setDeliveryMethod((p) => ({ ...p, [farmerId]: "delivery" }))
                          }
                          className="accent-[#0D631B]"
                        />
                        Delivery
                      </label>
                    )}
                  </div>
                </div>
                {method === "delivery" && (
                  <input
                    type="text"
                    placeholder="Enter delivery address..."
                    value={deliveryAddress[farmerId] ?? ""}
                    onChange={(e) =>
                      setDeliveryAddress((p) => ({ ...p, [farmerId]: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#0D631B]"
                  />
                )}
                <div className="flex justify-end">
                  <p className="text-sm text-gray-500">
                    Subtotal:{" "}
                    <span className="font-bold text-gray-900">
                      ₦{groupTotal.toLocaleString("en-NG")}
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
            <span>₦{totalPrice.toLocaleString("en-NG")}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs">
            <span>Payment processing</span>
            <span>Handled by escrow</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
            <span>Total</span>
            <span className="text-[#0D631B]">₦{totalPrice.toLocaleString("en-NG")}</span>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700">
          <i className="ri-shield-check-line mt-0.5 flex-shrink-0" />
          <span>
            All payments are held in escrow and only released to the farmer after you confirm delivery. Your money is safe.
          </span>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePlaceOrders}
          disabled={placing}
          className="w-full py-3.5 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {placing ? (
            <><i className="ri-loader-4-line animate-spin" /> Placing Orders...</>
          ) : (
            <><i className="ri-secure-payment-line" /> Place Orders — ₦{totalPrice.toLocaleString("en-NG")}</>
          )}
        </motion.button>
      </div>
    </div>
  );
}
