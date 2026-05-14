import Link from "next/link";

export default function BuyerOrders() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-md mx-auto">
      {/* Circular image placeholder */}
      <div className="w-52 h-52 rounded-full bg-center bg-no-repeat bg-cover relative" style={{ backgroundImage: "url(/no_order.png)" }}>
        <div className="absolute inset-0 bg-stone-400/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white flex items-center justify-center z-10">
          <i className="ri-shopping-cart-2-line text-3xl text-[#0D631B] line-through" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
      <p className="text-gray-400 text-sm leading-relaxed mb-8">
        Discover fresh produce from verified farmers and start your first secure escrow transaction.
      </p>

      <Link
        href="/dashboard/buyer/marketplace"
        className="px-8 py-3 rounded-xl bg-[#0D631B] text-white font-semibold hover:bg-[#0a4f15] transition-colors"
      >
        Browse Marketplace
      </Link>
    </div>
  );
}
