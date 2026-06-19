import { eq, and, avg, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { farmerRatings, orders, users } from "../db/schema.js";
const ratingSchema = z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().max(1000).optional(),
    quality_rating: z.number().int().min(1).max(5).optional(),
    communication_rating: z.number().int().min(1).max(5).optional(),
    delivery_rating: z.number().int().min(1).max(5).optional(),
});
export async function rateOrder(req, res) {
    const orderId = String(req.params["id"]);
    const parsed = ratingSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
        return;
    }
    const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderId, orderId), eq(orders.buyerId, req.user.userId)))
        .limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    if (order.status !== "completed") {
        res.status(400).json({ error: "Can only rate completed orders" });
        return;
    }
    const [existing] = await db
        .select({ ratingId: farmerRatings.ratingId })
        .from(farmerRatings)
        .where(eq(farmerRatings.orderId, orderId))
        .limit(1);
    if (existing) {
        res.status(409).json({ error: "This order has already been rated" });
        return;
    }
    const d = parsed.data;
    const [rating] = await db.insert(farmerRatings).values({
        farmerId: order.farmerId,
        buyerId: req.user.userId,
        orderId,
        rating: d.rating,
        review: d.review,
        qualityRating: d.quality_rating,
        communicationRating: d.communication_rating,
        deliveryRating: d.delivery_rating,
    }).returning();
    res.status(201).json({
        rating_id: rating.ratingId,
        farmer_id: rating.farmerId,
        buyer_id: rating.buyerId,
        order_id: rating.orderId,
        rating: rating.rating,
        review: rating.review,
        quality_rating: rating.qualityRating,
        communication_rating: rating.communicationRating,
        delivery_rating: rating.deliveryRating,
        created_at: rating.createdAt,
    });
}
export async function getFarmerRatings(req, res) {
    const farmerId = String(req.params["id"]);
    const [farmer] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, farmerId))
        .limit(1);
    if (!farmer) {
        res.status(404).json({ error: "Farmer not found" });
        return;
    }
    const rows = await db
        .select()
        .from(farmerRatings)
        .where(eq(farmerRatings.farmerId, farmerId))
        .orderBy(farmerRatings.createdAt);
    const [stats] = await db
        .select({ average: avg(farmerRatings.rating), total: count() })
        .from(farmerRatings)
        .where(eq(farmerRatings.farmerId, farmerId));
    res.json({
        farmer_id: farmerId,
        average_rating: stats?.average ? Number(Number(stats.average).toFixed(1)) : null,
        total_reviews: Number(stats?.total ?? 0),
        ratings: rows.map((r) => ({
            rating_id: r.ratingId,
            buyer_id: r.buyerId,
            order_id: r.orderId,
            rating: r.rating,
            review: r.review,
            quality_rating: r.qualityRating,
            communication_rating: r.communicationRating,
            delivery_rating: r.deliveryRating,
            created_at: r.createdAt,
        })),
    });
}
//# sourceMappingURL=ratings.controller.js.map