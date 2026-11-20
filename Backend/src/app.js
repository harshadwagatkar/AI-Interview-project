import express from "express"
import "dotenv/config"
import cors from 'cors'
import cookieparser from "cookie-parser"

import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"
import paymentRouter from "./routes/payment.route.js"

const app = express() 

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AI Interview Backend is running!"
    });
});

app.use(express.json())
const allowedOrigins = [
    "http://localhost:5173",
    "https://ai-interview-project-1-hhhd.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieparser()) 

//API's
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/api/interview', interviewRouter)
app.use('/api/payment', paymentRouter)


export default app
