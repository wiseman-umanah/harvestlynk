import { Router, type IRouter } from "express";
import {
  createOrder,
  getMyBuyerOrders,
  getMyFarmerOrders,
  confirmDelivery,
  updateOrderStatus,
  cancelOrder,
  simulatePayment,
  disputeOrder,
  requestRefund,
  requestCancellation,
  farmerRespondCancellation,
  resolveDispute,
} from "../../controllers/orders.controller.js";
import { rateOrder } from "../../controllers/ratings.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/buyer", getMyBuyerOrders);
router.get("/my", getMyFarmerOrders);

// Buyer actions
router.patch("/:id/confirm-delivery", confirmDelivery);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/request-cancellation", requestCancellation);
router.patch("/:id/dispute", disputeOrder);
router.patch("/:id/request-refund", requestRefund);

// Farmer actions
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/respond-cancellation", farmerRespondCancellation);

// Dev only
router.patch("/:id/simulate-payment", simulatePayment);

// Rating
router.post("/:id/rate", rateOrder);

// Admin — resolve a disputed order (no role guard at route level; add middleware if needed)
router.patch("/:id/resolve-dispute", resolveDispute);

export default router;
