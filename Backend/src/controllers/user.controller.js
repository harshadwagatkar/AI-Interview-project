import userModel from "../models/user.model.js";

const getUserById = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId)
        if(!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({user})
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

export {getUserById}