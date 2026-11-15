import express from 'express'
import { registerUser, logOut } from '../controllers/auth.controller.js'

const router = express.Router()

router.post('/google', registerUser)
router.post('/logout', logOut)

export default router 