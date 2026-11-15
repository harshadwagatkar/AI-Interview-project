import express from "express"
import app from "./src/app.js"
import connectDb from "./src/db/db.js"


app.listen(process.env.PORT, () => {
    console.log(`server running on port ${process.env.PORT}`)
    connectDb();
})