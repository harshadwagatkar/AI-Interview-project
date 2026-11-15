import React from 'react'
import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion } from "motion/react"
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../utils/firebase'; 
import axios from 'axios';
import { serverUrl } from '../App';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';

const Auth = ({isModel = false}) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleGoogleAuth = async () => {
    try {
      const response = await signInWithPopup(auth, provider)
      const username = response.user.displayName
      const email = response.user.email
      const res = await axios.post(`${serverUrl}/api/auth/google`, {username, email}, {withCredentials:true})
      dispatch(setUserData(res.data.user))
      navigate('/')

    } catch (error) {
      dispatch(setUserData(null))
      console.log(error)
    }
  }


  return (
    <div className={`
    w-full
    ${isModel ? "py-4" : 'bg-[#f3f3f3] min-h-screen flex justify-center items-center px-6 py-20'}`}>

      <motion.div 
      initial={{opacity:0, y:-40}}
      animate={{opacity:1, y:0}}
      transition={{duration:1.05}}
      className={
        `
        w-full ${isModel ? "max-w-md p-8 rounded-3xl" : "max-w-lg p-12 rounded-[32px]"}
        bg-white shadow-2xl border-gray-200`
      }>

        <div className='flex items-center justify-center gap-3 mb-6'>
            <div className='bg-black text-white p-2 rounded-lg'>
                <BsRobot size={18}/>
            </div>
            <h2 className='font-semibold text-lg'>InterviewMate</h2>
        </div>
        <h1 className='text-2xl md:text-3xl font-semibold text-center leading-snug mb-4'>
            Continue with
            <span className='bg-green-100 text-green-600 px-3 py-1 rounded-full inline-flex items-center gap-2'>
                <IoSparkles size={16}/>
                AI Smart Interview
            </span>
        </h1>
        <p className='text-gray-500 text-sm text-center'>
            Sign in to AI-powered mock interviews, track your progress, and unlock detailed performance insights
        </p>

        <motion.button
        onClick={handleGoogleAuth}
        // whileHover={{scale:1.1, transition:{duration:0.5}}}
        whileTap={{scale:0.95, opacity : 1}}
        whileHover={{opacity:0.7}}
        // transition={{duration : 0.2}}
        className='w-full bg-black text-white flex justify-center items-center rounded-full py-3 gap-3 text-lg mt-7'>
          <FcGoogle size={25}/>
          continue with Google
        </motion.button>
      </motion.div>
    </div>
  )
}

export default Auth
