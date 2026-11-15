import express from 'express'
import { getUserById } from '../controllers/user.controller.js'
import {authUserMiddleware} from '../middlewares/authUser.middleware.js'

const router = express.Router()

router.get('/current-user', authUserMiddleware, getUserById);

export default router