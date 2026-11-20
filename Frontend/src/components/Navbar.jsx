import React, { useState } from "react";
import { BsCoin } from "react-icons/bs";
import { useDispatch, useSelector } from "react-redux";
import { FaUserAstronaut } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { BsRobot } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import axios from "axios";
import { serverUrl } from '../App';
import { setUserData } from "../redux/userSlice";
import AuthModel from "./AuthModel";

const Navbar = () => {
    const {userData} = useSelector((state) => state.user)
    const [showCreditPopup, setShowCreditPopup] = useState(false)
    const [showUserPopup, setShowUserPopup] = useState(false)
    const [showAuth, setShowAuth] = useState(false)


    const navigate = useNavigate()
    const dispatch = useDispatch()
    
    //LogOut logic
    const handleLogout = async() => {
      try {
        await axios.post(`${serverUrl}/api/auth/logout`, {}, { withCredentials: true });
        // console.log(res.data)
        
        dispatch(setUserData(null))
        setShowCreditPopup(false)
        setShowUserPopup(false)
        navigate("/")

      } catch (error) {
        console.log("Error logging out:", error);
      }
    }

  return (
    <div className="bg-[#f3f3f3] flex justify-center px-4 pt-6">
      <motion.div
      initial={{opacity:0, y:40}}
      animate={{opacity:1, y:0}}
      transition={{duration:1.05}}
       className="w-full max-w-6xl bg-white rounded-[24px] shadow-sm border border-gray-200 px-8 py-4 flex justify-between items-center relative">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="bg-black text-white p-2 rounded-lg">
            <BsRobot size={18}/>
          </div>
          <h1 className="font-semibold hidden md:block text-lg">
            InterviewMate
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
            <div className="relative">
                <button 
                onClick={() => {
                  if(!userData) {
                    setShowAuth(true)
                    return
                  }
                  setShowCreditPopup(!showCreditPopup)
                  setShowUserPopup(false)
                }}
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-md hover:bg-gray-200">
                    <BsCoin size={20}/>
                    {userData?.credits || 0}
                </button>

                {showCreditPopup && (
                    <div className="absolute right-[-50] mt-3 w-64 bg-white shadow-xl border border-gray-200 rounded p-5 z-50">
                        <p className="text-sm text-gray-600 mb-4">
                            Need more credits to continue interviews?
                        </p>
                        <button 
                        onClick={() => navigate('/pricing')}
                        className="w-full bg-black text-white py-2 rounded-lg text-sm">
                            Buy more credits
                        </button>
                    </div>
                )}
            </div>
            <div className="relative">
                <button 
                onClick={() => {
                  if(!userData) {
                    setShowAuth(true)
                    return
                  }
                  setShowUserPopup(!showUserPopup)
                  setShowCreditPopup(false)
                }}
                className="w-9 h-9 bg-black text-white rounded-full flex justify-center items-center font-semibold">
                    {userData ? userData.username.slice(0,1).toUpperCase() : <FaUserAstronaut size={16}/>}
                </button>

                {showUserPopup && (
                    <div className="absolute right-[-50] mt-3 w-64 bg-white shadow-xl border border-gray-200 rounded p-5 z-50">
                        <p className="text-sm text-gray-600 mb-4">
                            Welcome, <span className="font-semibold text-blue-400">{userData?.username || "User"}</span>!
                        </p>
                        <button className="w-full bg-black text-white py-2 rounded-lg text-sm mb-2" onClick={() => navigate('/history')}>
                            Interview History
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="w-full  text-black border border-2 py-2 rounded-lg text-sm flex items-center justify-center gap-2 font-semibold"
                        >
                            <HiOutlineLogout size={20}/>
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </div>

      </motion.div>

      {showAuth && <AuthModel onClose={() => setShowAuth(false)}/>}
    </div>
  );
};

export default Navbar;
