import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { scans } from "../db/schema.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
const createScanSchema = z.object({
    crop_type: z.string().min(1).max(50),
    farmer_notes: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    result_disease: z.string().max(100).optional(),
    result_confidence: z.number().min(0).max(1).optional(),
    result_severity: z.enum(["low", "medium", "high"]).optional(),
    result_recommendations: z.record(z.string(), z.string()).optional(),
});
export async function createScan(req, res) {
    const file = req.file;
    if (!file) {
        res.status(400).json({ error: "No image provided" });
        return;
    }
    let parsedRecommendations;
    if (req.body?.result_recommendations) {
        try {
            parsedRecommendations = JSON.parse(String(req.body.result_recommendations));
        }
        catch { /* ignore malformed JSON */ }
    }
    const bodyData = {
        crop_type: req.body?.crop_type,
        farmer_notes: req.body?.farmer_notes,
        latitude: req.body?.latitude !== undefined ? Number(req.body.latitude) : undefined,
        longitude: req.body?.longitude !== undefined ? Number(req.body.longitude) : undefined,
        result_disease: req.body?.result_disease ?? undefined,
        result_confidence: req.body?.result_confidence !== undefined ? Number(req.body.result_confidence) : undefined,
        result_severity: req.body?.result_severity ?? undefined,
        result_recommendations: parsedRecommendations,
    };
    const parsed = createScanSchema.safeParse(bodyData);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
        return;
    }
    const imageUrl = await uploadToCloudinary(file.buffer, "harvestlynk/scans");
    const hasResult = parsed.data.result_disease !== undefined;
    const [scan] = await db.insert(scans).values({
        userId: req.user.userId,
        imageUrl,
        cropType: parsed.data.crop_type,
        farmerNotes: parsed.data.farmer_notes,
        latitude: parsed.data.latitude !== undefined ? String(parsed.data.latitude) : undefined,
        longitude: parsed.data.longitude !== undefined ? String(parsed.data.longitude) : undefined,
        status: hasResult ? "completed" : "pending",
        resultDisease: parsed.data.result_disease ?? null,
        resultConfidence: parsed.data.result_confidence !== undefined ? String(parsed.data.result_confidence) : null,
        resultSeverity: parsed.data.result_severity ?? null,
        resultRecommendations: parsed.data.result_recommendations ?? null,
        completedAt: hasResult ? new Date() : null,
    }).returning();
    res.status(201).json(formatScan(scan));
}
export async function getMyScans(req, res) {
    const rows = await db
        .select()
        .from(scans)
        .where(eq(scans.userId, req.user.userId))
        .orderBy(desc(scans.createdAt))
        .limit(50);
    res.json(rows.map(formatScan));
}
function formatScan(s) {
    return {
        scan_id: s.scanId,
        user_id: s.userId,
        image_url: s.imageUrl,
        thumbnail_url: s.thumbnailUrl,
        crop_type: s.cropType,
        farmer_notes: s.farmerNotes,
        status: s.status,
        result_disease: s.resultDisease,
        result_confidence: s.resultConfidence ? Number(s.resultConfidence) : null,
        result_severity: s.resultSeverity,
        result_recommendations: s.resultRecommendations,
        processing_time_ms: s.processingTimeMs,
        latitude: s.latitude,
        longitude: s.longitude,
        created_at: s.createdAt,
        completed_at: s.completedAt,
    };
}
//# sourceMappingURL=scans.controller.js.map