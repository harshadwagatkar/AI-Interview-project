import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import InterviewPage from "./pages/InterviewPage"
import axios from "axios";
import { useEffect } from "react";
import {useDispatch, useSelector } from "react-redux";
import { setUserData } from "./redux/userSlice";
import InterviewHistory from "./pages/InterviewHistory";
import Pricing from "./pages/Pricing";
import InterviewReport from "./pages/InterviewReport";

// export const serverUrl = "http://localhost:3000";
export const serverUrl =
    import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const App = () => {
  const dispatch = useDispatch();
  const {userData} = useSelector((state) => state.user)

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/current-user`, {
          withCredentials: true,
        });
        dispatch(setUserData(res.data.user));
      } catch (error) {
        console.error(error);
        dispatch(setUserData(null));
      }
    };
    getUser();
  }, [dispatch, userData]);

  return (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/interview" element={<InterviewPage/>} />
        <Route path="/history" element={<InterviewHistory/>} />
        <Route path="/pricing" element={<Pricing/>} />
        <Route path="/report/:id" element={<InterviewReport/>} />
    </Routes>
  );
};

export default App;
