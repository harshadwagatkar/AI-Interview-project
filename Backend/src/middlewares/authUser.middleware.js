import jwt from "jsonwebtoken"

const authUserMiddleware = (req, res, next) => { 
    const token = req.cookies.token

    if(!token) {
        return res.status(401).json({message: 'Unauthorized'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(!decoded) {
            return res.status(401).json({message: 'Unauthorized'})
        }

        req.userId = decoded.id
        next()

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

export {authUserMiddleware}