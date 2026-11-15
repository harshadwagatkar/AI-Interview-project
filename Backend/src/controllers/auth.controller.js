import userModel from '../models/user.model.js'
import jwt from 'jsonwebtoken'

const registerUser = async (req, res) => {
    const {username, email} = req.body

    let user = await userModel.findOne({email})

    if(!user) {  
        user = new userModel({
            username, 
            email,
        })
        await user.save()
    }
    

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1h'})
    res.cookie('token', token, { httpOnly: true, sameSite:"none", secure: true })

    res.status(201).json({message: 'User registered successfully'})

}

const logOut = async (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite:"strict" })
    res.status(200).json({message: 'User logged out successfully'})
}

export {registerUser, logOut}