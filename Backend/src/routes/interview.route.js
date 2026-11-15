import express from "express"
import {authUserMiddleware} from '../middlewares/authUser.middleware.js'
import { analyzeResume, finishInterview, generateQuestion, getInterviewReport, getMyInterviews, submitAnswer } from "../controllers/interview.controller.js"
import {upload} from "../middlewares/multer.js"

const router = express.Router()

router.post("/resume", authUserMiddleware, upload.single("resume"), analyzeResume)
router.post("/generate-questions", authUserMiddleware, generateQuestion)
router.post("/submit-answer", authUserMiddleware, submitAnswer)
router.post("/finish", authUserMiddleware, finishInterview)

router.get("/get-interview", authUserMiddleware, getMyInterviews)
router.get("/report/:id", authUserMiddleware, getInterviewReport)

export default router 