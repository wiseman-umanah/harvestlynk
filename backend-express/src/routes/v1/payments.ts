import express, { type IRouter } from "express";
import { handleNombaWebhook } from "../../controllers/payments.controller.js";

const router: IRouter = express.Router();

router.post("/nomba-webhook", handleNombaWebhook);

export default router;
