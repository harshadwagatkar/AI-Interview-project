import express from "express"
import {authUserMiddleware} from '../middlewares/authUser.middleware.js'
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router()

router.post("/order", authUserMiddleware, createOrder)
router.post("/verify", authUserMiddleware, verifyPayment)

export default router;