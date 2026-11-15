import React from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import { FaArrowLeft, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { serverUrl } from "../App";

const CopyCode = ({ interviewData, onFinish }) => {
  const { interviewId, questions, userName } = interviewData;
  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const recognitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  const videoRef = useRef(null);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const femaleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female"),
      );

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      //Male voice
      const maleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male"),
      );

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  // Speak Function:

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      //Add natural pauses and intonation
      const humanText = text.replace(/,/g, ", ... ").replace(/\./g, ". ... ");

      const utterance = new SpeechSynthesisUtterance(humanText);

      utterance.voice = selectedVoice;

      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic();
        videoRef.current?.play();
      };

      utterance.onend = () => {
        videoRef.current?.pause();
        videoRef.current.currentTime = 0;
        setIsAIPlaying(false);

        if (isMicOn) {
          startMic();
        }

        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };

      setSubtitle(text);
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }
    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(
          `Hello ${userName}, welcome to the AI Smart Interview. I will be asking you a series of questions. Please answer them to the best of your ability. Let's get started!`,
        );

        await speakText(
          `I will ask you few questions. Just answer naturally and confidently. You can also type your answer in the text box below. Let's begin!`,
        );

        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((r) => setTimeout(r, 800));

        if (currentIndex === questions.length - 1) {
          await speakText(
            "Alright, this one might be a bit more challenging. Please take your time and answer thoughtfully.",
          );
        }

        await speakText(currentQuestion.question);

        if (isMicOn) {
          startMic();
        }
      }
    };

    runIntro();
  }, [selectedVoice, isIntroPhase, currentIndex]);




  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;
    // if (isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isIntroPhase, currentIndex]);

  useEffect(() => {
    if(!isIntroPhase && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit || 60);
    }
  }, [currentIndex])




  useEffect(() => {
    if (!(webkitSpeechRecognition in window)) return;

    const recognition = new window.webkitSpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      setAnswer((prev) => prev + " " + transcript);
    };

    recognitionRef.current = recognition;
  }, []);



  const startMic = () => {
    if (recognitionRef.current && !isAIPlaying) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  const stopMic = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
    setIsMicOn(!isMicOn);
  };




  const submitAnswer = async () => {
    if (isSubmitting) return;
    stopMic();
    setIsSubmitting(true);

    try {
      const result = await axios.post(
        serverUrl + "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer,
          timeTaken: currentQuestion.timeLimit - timeLeft,
        },
        { withCredentials: true },
      );

      setFeedback(result.data.feedback);
      speakText(result.data.feedback);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting answer:", error);
      setIsSubmitting(false);
    }
  };


  const handleNext = async () => {
    setAnswer("");
    setFeedback("");

    if(currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let's move to the next question.");

    setCurrentIndex(currentIndex + 1);

    setTimeout(() => {
      if(isMicOn) startMic();
    }, 500);
  }



  const finishInterview = async (params) => {
    stopMic();
    setIsMicOn(false);
    try {
      const result = await axios.post(serverUrl + "/api/interview/finish", {
        interviewId,
      }, { withCredentials: true });

      console.log("Interview finished:", result.data);
      onFinish(result.data);
    } catch (error) {
      console.error("Error finishing interview:", error);
    }
  }


  useEffect(() => {
    if(isIntroPhase) return;
    if(!currentQuestion) return;

    if(timeLeft === 0 && !feedback && !isSubmitting) {
      handleSubmit();
    }

  }, [timeLeft])

  useEffect(() => {
    return () => {
      if(recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }

      window.speechSynthesis.cancel();
    }
  }, [])



  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border-gray-200 flex flex-col lg:flex-row overflow-hidden">
        {/* video section */}
        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Subtitle pending */}

          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          {/* timer area */}
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Interview Status</span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  {isAIPlaying ? "AI is speaking..." : ""}
                </span>
              )}
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timeLimit}
              />
            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="grid grid-cols-2 gap-6 text-center">
              <div className="">
                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-400">Current Questions</span>
              </div>

              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>
                <span className="text-xs text-gray-400">Total Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text section */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed pr-16">
                {currentQuestion?.question}
              </div>
            </div>
          )}
          <textarea
            placeholder="Type your answer here..."
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              <motion.button
                onClick={toggleMic}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg"
              >
                {isMicOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20}/>}
              </motion.button>

              <motion.button
                onClick={submitAnswer}
                disabled={isSubmitting}
                whileTap={{ scale: 0.9 }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm"
            >
              <p className="text-emerald-700 font-medium mb-4">{feedback}</p>

              <button 
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1">
                Next question <FaArrowLeft size={18}/>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopyCode;






import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";

const Step2Interview = ({ interviewData, onFinish }) => {
  const { interviewId, questions, userName } = interviewData;

  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const [timeLeft, setTimeLeft] = useState(
    questions[0]?.timeLimit || 60
  );

  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  const videoRef = useRef(null);

  // Speech recognition
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const isRecognitionRunningRef = useRef(false);

  // Prevent duplicate speech
  const speechRunningRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  // --------------------------------------------------
  // LOAD SPEECH SYNTHESIS VOICES
  // --------------------------------------------------

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis is not supported.");
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices.length) return;

      const femaleVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("zira") ||
          voice.name.toLowerCase().includes("samantha") ||
          voice.name.toLowerCase().includes("female")
      );

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      const maleVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("david") ||
          voice.name.toLowerCase().includes("mark") ||
          voice.name.toLowerCase().includes("male")
      );

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const videoSource =
    voiceGender === "male" ? maleVideo : femaleVideo;

  // --------------------------------------------------
  // SPEECH RECOGNITION SETUP
  // --------------------------------------------------

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        "Speech Recognition is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    // Keep listening
    recognition.continuous = true;

    // We only need final results
    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    // -----------------------------------------------
    // When speech is recognized
    // -----------------------------------------------

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (event.results[i].isFinal) {
          finalTranscript +=
            event.results[i][0].transcript;
        }
      }

      finalTranscript = finalTranscript.trim();

      if (finalTranscript) {
        setAnswer((prev) => {
          const previous = prev.trim();

          if (!previous) {
            return finalTranscript;
          }

          return previous + " " + finalTranscript;
        });
      }
    };

    // -----------------------------------------------
    // Recognition starts
    // -----------------------------------------------

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");

      isRecognitionRunningRef.current = true;
    };

    // -----------------------------------------------
    // Recognition ends
    // -----------------------------------------------

    recognition.onend = () => {
      console.log("🎤 Speech recognition ended");

      isRecognitionRunningRef.current = false;

      // Chrome can automatically stop recognition.
      // Restart it if the user still wants the mic on.
      if (
        shouldListenRef.current &&
        !speechRunningRef.current
      ) {
        setTimeout(() => {
          startMic();
        }, 300);
      }
    };

    // -----------------------------------------------
    // Recognition error
    // -----------------------------------------------

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      isRecognitionRunningRef.current = false;

      // These errors should not restart continuously
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldListenRef.current = false;
        setIsMicOn(false);

        alert(
          "Microphone permission was denied. Please allow microphone access in your browser."
        );
      }

      if (event.error === "no-speech") {
        // Chrome may stop because there was no speech.
        // onend will restart it.
        return;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;

      try {
        recognition.stop();
      } catch (error) {
        console.log("Recognition cleanup:", error);
      }

      recognitionRef.current = null;
    };
  }, []);

  // --------------------------------------------------
  // START MICROPHONE
  // --------------------------------------------------

  const startMic = () => {
    if (!recognitionRef.current) {
      console.warn(
        "Speech recognition is not available."
      );
      return;
    }

    if (speechRunningRef.current) {
      return;
    }

    if (isRecognitionRunningRef.current) {
      return;
    }

    shouldListenRef.current = true;
    setIsMicOn(true);

    try {
      recognitionRef.current.start();

      console.log("🎤 Starting microphone...");
    } catch (error) {
      console.log(
        "Microphone start error:",
        error.message
      );
    }
  };

  // --------------------------------------------------
  // STOP MICROPHONE
  // --------------------------------------------------

  const stopMic = () => {
    shouldListenRef.current = false;
    setIsMicOn(false);

    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.log(
        "Microphone stop error:",
        error.message
      );
    }

    isRecognitionRunningRef.current = false;
  };

  // --------------------------------------------------
  // TOGGLE MICROPHONE
  // --------------------------------------------------

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
  };

  // --------------------------------------------------
  // SPEAK TEXT
  // --------------------------------------------------

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (
        !("speechSynthesis" in window) ||
        !selectedVoice
      ) {
        resolve();
        return;
      }

      // Stop microphone before AI starts talking
      stopMic();

      // Cancel previous speech
      window.speechSynthesis.cancel();

      const humanText = text
        .replace(/,/g, ", ... ")
        .replace(/\./g, ". ... ");

      const utterance =
        new SpeechSynthesisUtterance(humanText);

      utterance.voice = selectedVoice;

      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      speechRunningRef.current = true;

      utterance.onstart = () => {
        console.log("🔊 AI started speaking");

        setIsAIPlaying(true);

        videoRef.current?.play().catch(() => {});
      };

      utterance.onend = () => {
        console.log("🔊 AI finished speaking");

        speechRunningRef.current = false;

        setIsAIPlaying(false);

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        setSubtitle("");

        resolve();
      };

      utterance.onerror = (event) => {
        console.error(
          "Speech synthesis error:",
          event.error
        );

        speechRunningRef.current = false;
        setIsAIPlaying(false);

        resolve();
      };

      setSubtitle(text);

      window.speechSynthesis.speak(utterance);
    });
  };

  // --------------------------------------------------
  // INTRO + QUESTION SPEECH
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }

    let cancelled = false;

    const runInterviewSpeech = async () => {
      if (cancelled) return;

      if (isIntroPhase) {
        await speakText(
          `Hello ${userName}, welcome to the AI Smart Interview. I will be asking you a series of questions. Please answer them to the best of your ability. Let's get started!`
        );

        if (cancelled) return;

        await speakText(
          `I will ask you a few questions. Just answer naturally and confidently. You can also type your answer in the text box below. Let's begin!`
        );

        if (cancelled) return;

        setIsIntroPhase(false);

        return;
      }

      if (!currentQuestion) {
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 800)
      );

      if (cancelled) return;

      if (currentIndex === questions.length - 1) {
        await speakText(
          "Alright, this one might be a bit more challenging. Please take your time and answer thoughtfully."
        );
      }

      if (cancelled) return;

      await speakText(currentQuestion.question);

      if (cancelled) return;

      // Start microphone after AI finishes speaking
      startMic();
    };

    runInterviewSpeech();

    return () => {
      cancelled = true;
    };
  }, [
    selectedVoice,
    isIntroPhase,
    currentIndex,
  ]);

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (isIntroPhase || !currentQuestion) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isIntroPhase, currentIndex]);

  // --------------------------------------------------
  // RESET TIMER WHEN QUESTION CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!isIntroPhase && currentQuestion) {
      setTimeLeft(
        currentQuestion.timeLimit || 60
      );
    }
  }, [currentIndex, isIntroPhase]);

  // --------------------------------------------------
  // AUTO SUBMIT WHEN TIMER ENDS
  // --------------------------------------------------

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !isIntroPhase &&
      !feedback &&
      !isSubmitting
    ) {
      submitAnswer();
    }
  }, [timeLeft]);

  // --------------------------------------------------
  // SUBMIT ANSWER
  // --------------------------------------------------

  const submitAnswer = async () => {
    if (isSubmitting) {
      return;
    }

    stopMic();

    setIsSubmitting(true);

    try {
      const result = await axios.post(
        serverUrl + "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer: answer.trim(),
          timeTaken:
            currentQuestion.timeLimit -
            timeLeft,
        },
        {
          withCredentials: true,
        }
      );

      setFeedback(result.data.feedback);

      // Speak feedback
      await speakText(result.data.feedback);

      setIsSubmitting(false);
    } catch (error) {
      console.error(
        "Error submitting answer:",
        error
      );

      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // NEXT QUESTION
  // --------------------------------------------------

  const handleNext = async () => {
    stopMic();

    setAnswer("");
    setFeedback("");

    if (
      currentIndex + 1 >= questions.length
    ) {
      await finishInterview();
      return;
    }

    await speakText(
      "Alright, let's move to the next question."
    );

    setCurrentIndex((prev) => prev + 1);
  };

  // --------------------------------------------------
  // FINISH INTERVIEW
  // --------------------------------------------------

  const finishInterview = async () => {
    stopMic();

    window.speechSynthesis.cancel();

    try {
      const result = await axios.post(
        serverUrl + "/api/interview/finish",
        {
          interviewId,
        },
        {
          withCredentials: true,
        }
      );

      console.log(
        "Interview finished:",
        result.data
      );

      onFinish(result.data);
    } catch (error) {
      console.error(
        "Error finishing interview:",
        error
      );
    }
  };

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      speechRunningRef.current = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log(error);
        }
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">

      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border-gray-200 flex flex-col lg:flex-row overflow-hidden">

        {/* VIDEO SECTION */}

        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">

          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />

          </div>

          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">

              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>

            </div>
          )}

          {/* TIMER */}

          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">

            <div className="flex justify-between items-center">

              <span className="text-sm text-gray-500">
                Interview Status
              </span>

              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  AI is speaking...
                </span>
              )}

            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex justify-center">

              <Timer
                timeLeft={timeLeft}
                totalTime={
                  currentQuestion?.timeLimit
                }
              />

            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="grid grid-cols-2 gap-6 text-center">

              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>

                <span className="text-xs text-gray-400 block">
                  Current Question
                </span>
              </div>

              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>

                <span className="text-xs text-gray-400 block">
                  Total Questions
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* TEXT SECTION */}

        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">

          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">

              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question {currentIndex + 1} of{" "}
                {questions.length}
              </p>

              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed pr-16">
                {currentQuestion?.question}
              </div>

            </div>
          )}

          <textarea
            placeholder={
              isMicOn
                ? "Speak your answer or type here..."
                : "Type your answer here..."
            }
            onChange={(e) =>
              setAnswer(e.target.value)
            }
            value={answer}
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">

              {/* MICROPHONE BUTTON */}

              <motion.button
                onClick={toggleMic}
                disabled={isAIPlaying || isSubmitting}
                whileTap={{ scale: 0.9 }}
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full text-white shadow-lg transition ${
                  isMicOn
                    ? "bg-emerald-600"
                    : "bg-black"
                } disabled:opacity-50`}
              >

                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash size={20} />
                )}

              </motion.button>

              {/* SUBMIT */}

              <motion.button
                onClick={submitAnswer}
                disabled={
                  isSubmitting ||
                  isAIPlaying
                }
                whileTap={{ scale: 0.9 }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {isSubmitting
                  ? "Submitting..."
                  : "Submit Answer"}

              </motion.button>

            </div>
          ) : (
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm"
            >

              <p className="text-emerald-700 font-medium mb-4">
                {feedback}
              </p>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1"
              >

                Next question

                <FaArrowLeft size={18} />

              </button>

            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Step2Interview;








/////// most correct code : 
import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";

const Step2Interview = ({ interviewData, onFinish }) => {
  const { interviewId, questions, userName } = interviewData;

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const [timeLeft, setTimeLeft] = useState(
    questions[0]?.timeLimit || 60
  );

  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  // Useful status for user
  const [speechError, setSpeechError] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // --------------------------------------------------
  // REFS
  // --------------------------------------------------

  const videoRef = useRef(null);

  // Speech Recognition
  const recognitionRef = useRef(null);

  // Is browser recognition actually running?
  const recognitionRunningRef = useRef(false);

  // Should microphone remain ON?
  const shouldListenRef = useRef(false);

  // Prevent recognition while AI is speaking
  const speechRunningRef = useRef(false);

  // Prevent multiple recognition starts
  const restartTimeoutRef = useRef(null);

  // Prevent submit multiple times
  const submittingRef = useRef(false);

  // Current answer reference
  const answerRef = useRef("");

  // --------------------------------------------------
  // CURRENT QUESTION
  // --------------------------------------------------

  const currentQuestion = questions[currentIndex];

  const videoSource =
    voiceGender === "male" ? maleVideo : femaleVideo;

  // Keep answerRef synchronized with answer
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // ==================================================
  // LOAD SPEECH SYNTHESIS VOICES
  // ==================================================

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis is not supported.");
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices || voices.length === 0) {
        return;
      }

      // Try to find female voice
      const femaleVoice = voices.find((voice) => {
        const name = voice.name.toLowerCase();

        return (
          name.includes("zira") ||
          name.includes("samantha") ||
          name.includes("female")
        );
      });

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      // Try to find male voice
      const maleVoice = voices.find((voice) => {
        const name = voice.name.toLowerCase();

        return (
          name.includes("david") ||
          name.includes("mark") ||
          name.includes("male")
        );
      });

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      // Fallback
      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ==================================================
  // SPEECH RECOGNITION SETUP
  // ==================================================

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    // Browser doesn't support speech recognition
    if (!SpeechRecognition) {
      console.error(
        "Speech Recognition is not supported in this browser."
      );

      setIsSpeechSupported(false);

      setSpeechError(
        "Voice recognition is not supported in this browser. Please use Google Chrome."
      );

      return;
    }

    setIsSpeechSupported(true);

    // Create recognition object
    const recognition = new SpeechRecognition();

    // --------------------------------------------------
    // IMPORTANT SETTINGS
    // --------------------------------------------------

    recognition.lang = "en-US";

    // Keep listening continuously
    recognition.continuous = true;

    // We want final recognized sentences
    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    // --------------------------------------------------
    // ON START
    // --------------------------------------------------

    recognition.onstart = () => {
      console.log("🎤 Speech recognition STARTED");

      recognitionRunningRef.current = true;

      setIsMicOn(true);
      setSpeechError("");
    };

    // --------------------------------------------------
    // ON RESULT
    // --------------------------------------------------

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];

        const transcript =
          result[0]?.transcript || "";

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      // -----------------------------------------------
      // FINAL RESULT
      // -----------------------------------------------

      if (finalText.trim()) {
        const newText = finalText.trim();

        console.log("✅ Recognized:", newText);

        setAnswer((previous) => {
          const oldText = previous.trim();

          if (!oldText) {
            return newText;
          }

          return `${oldText} ${newText}`;
        });
      }

      // -----------------------------------------------
      // INTERIM RESULT
      // -----------------------------------------------

      if (interimText.trim()) {
        console.log("🎤 Listening:", interimText.trim());
      }
    };

    // --------------------------------------------------
    // ON ERROR
    // --------------------------------------------------

    recognition.onerror = (event) => {
      console.error(
        "🎤 Speech recognition error:",
        event.error
      );

      recognitionRunningRef.current = false;

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
        case "service-not-allowed":
          shouldListenRef.current = false;
          setIsMicOn(false);

          setSpeechError(
            "Microphone permission denied. Please allow microphone access in Chrome."
          );

          break;

        case "no-speech":
          console.log(
            "No speech detected. Recognition may restart."
          );

          // Don't turn microphone OFF.
          break;

        case "audio-capture":
          shouldListenRef.current = false;
          setIsMicOn(false);

          setSpeechError(
            "No microphone was found. Please check your microphone."
          );

          break;

        case "network":
          shouldListenRef.current = false;
          setIsMicOn(false);

          setSpeechError(
            "Speech recognition network error. Please check your internet connection."
          );

          break;

        case "aborted":
          console.log("Speech recognition aborted.");
          break;

        default:
          setSpeechError(
            `Speech recognition error: ${event.error}`
          );
      }
    };

    // --------------------------------------------------
    // ON END
    // --------------------------------------------------

    recognition.onend = () => {
      console.log("🎤 Speech recognition ENDED");

      recognitionRunningRef.current = false;

      /*
       * Chrome sometimes stops SpeechRecognition automatically.
       *
       * If the user still wants the microphone ON,
       * start it again.
       */

      if (
        shouldListenRef.current &&
        !speechRunningRef.current
      ) {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }

        restartTimeoutRef.current = setTimeout(() => {
          startRecognition();
        }, 400);
      } else {
        setIsMicOn(false);
      }
    };

    // Store recognition object
    recognitionRef.current = recognition;

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    return () => {
      shouldListenRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      try {
        recognition.stop();
      } catch (error) {
        console.log("Recognition cleanup:", error);
      }

      recognitionRef.current = null;
    };
  }, []);

  // ==================================================
  // START RECOGNITION
  // ==================================================

  const startRecognition = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      console.error(
        "Speech recognition object does not exist."
      );

      setSpeechError(
        "Speech recognition is not available."
      );

      return;
    }

    // Don't start while AI is speaking
    if (speechRunningRef.current) {
      console.log(
        "AI is speaking. Microphone will not start."
      );

      return;
    }

    // Already running
    if (recognitionRunningRef.current) {
      console.log(
        "Speech recognition is already running."
      );

      return;
    }

    shouldListenRef.current = true;

    setSpeechError("");

    try {
      recognition.start();

      console.log("🎤 Starting speech recognition...");
    } catch (error) {
      console.error(
        "❌ Error starting speech recognition:",
        error
      );

      /*
       * InvalidStateError usually means recognition
       * is already starting/running.
       */

      if (
        error.name !== "InvalidStateError"
      ) {
        setSpeechError(
          "Could not start microphone. Please try again."
        );
      }
    }
  };

  // ==================================================
  // STOP RECOGNITION
  // ==================================================

  const stopRecognition = () => {
    shouldListenRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    setIsMicOn(false);

    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    try {
      recognition.stop();

      console.log("🎤 Stopping speech recognition...");
    } catch (error) {
      console.log(
        "Recognition stop error:",
        error
      );
    }

    recognitionRunningRef.current = false;
  };

  // ==================================================
  // REQUEST MICROPHONE PERMISSION
  // ==================================================

  const requestMicrophonePermission = async () => {
    /*
     * This is important.
     *
     * Browser permission is requested directly from
     * the microphone button click.
     */

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn(
        "getUserMedia is not supported."
      );

      return true;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      console.log(
        "🎙️ Microphone permission granted."
      );

      /*
       * We only need permission.
       * SpeechRecognition itself controls the mic.
       */

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      return true;
    } catch (error) {
      console.error(
        "❌ Microphone permission error:",
        error
      );

      setSpeechError(
        "Microphone permission denied. Please allow microphone access in your browser."
      );

      return false;
    }
  };

  // ==================================================
  // START MICROPHONE
  // ==================================================

  const startMic = async () => {
    if (!isSpeechSupported) {
      setSpeechError(
        "Please use Google Chrome for voice recognition."
      );

      return;
    }

    if (isAIPlaying || speechRunningRef.current) {
      console.log(
        "AI is currently speaking."
      );

      return;
    }

    /*
     * Ask browser for microphone permission.
     *
     * This happens because the function can be called
     * directly by the user clicking the microphone.
     */

    const permission =
      await requestMicrophonePermission();

    if (!permission) {
      return;
    }

    startRecognition();
  };

  // ==================================================
  // STOP MICROPHONE
  // ==================================================

  const stopMic = () => {
    stopRecognition();
  };

  // ==================================================
  // TOGGLE MICROPHONE
  // ==================================================

  const toggleMic = async () => {
    if (isMicOn) {
      stopMic();
    } else {
      await startMic();
    }
  };

  // ==================================================
  // SPEAK TEXT
  // ==================================================

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (
        !("speechSynthesis" in window) ||
        !selectedVoice
      ) {
        resolve();
        return;
      }

      // Stop microphone before AI speaks
      stopMic();

      // Cancel previous speech
      window.speechSynthesis.cancel();

      const humanText = text
        .replace(/,/g, ", ... ")
        .replace(/\./g, ". ... ");

      const utterance =
        new SpeechSynthesisUtterance(
          humanText
        );

      utterance.voice = selectedVoice;

      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      speechRunningRef.current = true;

      // ------------------------------------------------
      // AI SPEECH START
      // ------------------------------------------------

      utterance.onstart = () => {
        console.log(
          "🔊 AI started speaking"
        );

        setIsAIPlaying(true);

        videoRef.current
          ?.play()
          .catch(() => {});
      };

      // ------------------------------------------------
      // AI SPEECH END
      // ------------------------------------------------

      utterance.onend = () => {
        console.log(
          "🔊 AI finished speaking"
        );

        speechRunningRef.current = false;

        setIsAIPlaying(false);

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        setSubtitle("");

        resolve();
      };

      // ------------------------------------------------
      // AI SPEECH ERROR
      // ------------------------------------------------

      utterance.onerror = (event) => {
        console.error(
          "🔊 Speech synthesis error:",
          event.error
        );

        speechRunningRef.current = false;

        setIsAIPlaying(false);

        setSubtitle("");

        resolve();
      };

      setSubtitle(text);

      window.speechSynthesis.speak(
        utterance
      );
    });
  };

  // ==================================================
  // INTRO + QUESTION SPEECH
  // ==================================================

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }

    let cancelled = false;

    const runInterviewSpeech = async () => {
      if (cancelled) {
        return;
      }

      // ------------------------------------------------
      // INTRO
      // ------------------------------------------------

      if (isIntroPhase) {
        await speakText(
          `Hello ${userName}, welcome to the AI Smart Interview. I will be asking you a series of questions. Please answer them to the best of your ability. Let's get started!`
        );

        if (cancelled) {
          return;
        }

        await speakText(
          `I will ask you a few questions. Just answer naturally and confidently. You can also type your answer in the text box below. Let's begin!`
        );

        if (cancelled) {
          return;
        }

        setIsIntroPhase(false);

        return;
      }

      // ------------------------------------------------
      // QUESTION
      // ------------------------------------------------

      if (!currentQuestion) {
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 800)
      );

      if (cancelled) {
        return;
      }

      // Special message for last question
      if (
        currentIndex ===
        questions.length - 1
      ) {
        await speakText(
          "Alright, this one might be a bit more challenging. Please take your time and answer thoughtfully."
        );
      }

      if (cancelled) {
        return;
      }

      // Speak actual question
      await speakText(
        currentQuestion.question
      );

      if (cancelled) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * We DO NOT automatically request microphone
       * permission here.
       *
       * The user should click the microphone once.
       *
       * After permission is granted, recognition can
       * automatically restart when Chrome stops it.
       */

      console.log(
        "Question finished. Click microphone to answer."
      );
    };

    runInterviewSpeech();

    return () => {
      cancelled = true;
    };
  }, [
    selectedVoice,
    isIntroPhase,
    currentIndex,
  ]);

  // ==================================================
  // TIMER
  // ==================================================

  useEffect(() => {
    if (
      isIntroPhase ||
      !currentQuestion
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    isIntroPhase,
    currentIndex,
  ]);

  // ==================================================
  // RESET TIMER
  // ==================================================

  useEffect(() => {
    if (
      !isIntroPhase &&
      currentQuestion
    ) {
      setTimeLeft(
        currentQuestion.timeLimit || 60
      );
    }
  }, [
    currentIndex,
    isIntroPhase,
    currentQuestion,
  ]);

  // ==================================================
  // AUTO SUBMIT
  // ==================================================

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !isIntroPhase &&
      !feedback &&
      !isSubmitting
    ) {
      submitAnswer();
    }
  }, [
    timeLeft,
    isIntroPhase,
    feedback,
    isSubmitting,
  ]);

  // ==================================================
  // SUBMIT ANSWER
  // ==================================================

  const submitAnswer = async () => {
    if (
      submittingRef.current ||
      isSubmitting
    ) {
      return;
    }

    submittingRef.current = true;

    // Stop microphone
    stopMic();

    setIsSubmitting(true);

    try {
      const finalAnswer =
        answerRef.current.trim();

      console.log(
        "Submitting answer:",
        finalAnswer
      );

      const result = await axios.post(
        serverUrl +
          "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,

          // Send recognized text
          answer: finalAnswer,

          timeTaken:
            currentQuestion.timeLimit -
            timeLeft,
        },
        {
          withCredentials: true,
        }
      );

      setFeedback(
        result.data.feedback
      );

      // Speak AI feedback
      await speakText(
        result.data.feedback
      );
    } catch (error) {
      console.error(
        "Error submitting answer:",
        error
      );

      setFeedback(
        "Something went wrong while submitting your answer. Please try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ==================================================
  // NEXT QUESTION
  // ==================================================

  const handleNext = async () => {
    stopMic();

    setAnswer("");
    answerRef.current = "";

    setFeedback("");

    if (
      currentIndex + 1 >=
      questions.length
    ) {
      await finishInterview();
      return;
    }

    await speakText(
      "Alright, let's move to the next question."
    );

    setCurrentIndex(
      (previous) => previous + 1
    );
  };

  // ==================================================
  // FINISH INTERVIEW
  // ==================================================

  const finishInterview = async () => {
    stopMic();

    speechRunningRef.current = false;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const result = await axios.post(
        serverUrl +
          "/api/interview/finish",
        {
          interviewId,
        },
        {
          withCredentials: true,
        }
      );

      console.log(
        "Interview finished:",
        result.data
      );

      onFinish(result.data);
    } catch (error) {
      console.error(
        "Error finishing interview:",
        error
      );
    }
  };

  // ==================================================
  // CLEANUP
  // ==================================================

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;

      recognitionRunningRef.current = false;

      speechRunningRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(
          restartTimeoutRef.current
        );
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log(
            "Recognition cleanup:",
            error
          );
        }
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">

      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">

        {/* ==================================================
            VIDEO SECTION
        ================================================== */}

        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">

          {/* VIDEO */}

          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />

          </div>

          {/* SUBTITLE */}

          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">

              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>

            </div>
          )}

          {/* ==================================================
              TIMER
          ================================================== */}

          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">

            <div className="flex justify-between items-center">

              <span className="text-sm text-gray-500">
                Interview Status
              </span>

              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  AI is speaking...
                </span>
              )}

              {!isAIPlaying &&
                isMicOn && (
                  <span className="text-sm font-semibold text-emerald-600">
                    Listening...
                  </span>
                )}

            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="flex justify-center">

              <Timer
                timeLeft={timeLeft}
                totalTime={
                  currentQuestion?.timeLimit
                }
              />

            </div>

            <div className="h-px bg-gray-200"></div>

            <div className="grid grid-cols-2 gap-6 text-center">

              <div>

                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>

                <span className="text-xs text-gray-400 block">
                  Current Question
                </span>

              </div>

              <div>

                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>

                <span className="text-xs text-gray-400 block">
                  Total Questions
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* ==================================================
            TEXT SECTION
        ================================================== */}

        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">

          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>

          {/* QUESTION */}

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">

              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question{" "}
                {currentIndex + 1} of{" "}
                {questions.length}
              </p>

              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed pr-16">

                {currentQuestion?.question}

              </div>

            </div>
          )}

          {/* ==================================================
              SPEECH ERROR
          ================================================== */}

          {!isSpeechSupported && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">

              <p className="text-red-600 text-sm">
                {speechError}
              </p>

            </div>
          )}

          {speechError &&
            isSpeechSupported && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">

                <p className="text-yellow-700 text-sm">
                  {speechError}
                </p>

              </div>
            )}

          {/* ==================================================
              ANSWER TEXTAREA
          ================================================== */}

          <textarea
            placeholder={
              isMicOn
                ? "Speak your answer... your words will appear here."
                : "Click the microphone and speak, or type your answer here..."
            }
            onChange={(event) => {
              setAnswer(event.target.value);
              answerRef.current =
                event.target.value;
            }}
            value={answer}
            className="flex-1 min-h-[250px] bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />

          {/* ==================================================
              BUTTONS
          ================================================== */}

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">

              {/* MICROPHONE */}

              <motion.button
                type="button"
                onClick={toggleMic}
                disabled={
                  isAIPlaying ||
                  isSubmitting ||
                  !isSpeechSupported
                }
                whileTap={{
                  scale: 0.9,
                }}
                title={
                  isMicOn
                    ? "Stop microphone"
                    : "Start microphone"
                }
                className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full text-white shadow-lg transition ${
                  isMicOn
                    ? "bg-emerald-600"
                    : "bg-black"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >

                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash
                    size={20}
                  />
                )}

              </motion.button>

              {/* SUBMIT */}

              <motion.button
                type="button"
                onClick={submitAnswer}
                disabled={
                  isSubmitting ||
                  isAIPlaying
                }
                whileTap={{
                  scale: 0.9,
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {isSubmitting
                  ? "Submitting..."
                  : "Submit Answer"}

              </motion.button>

            </div>
          ) : (

            /* ==================================================
               FEEDBACK
            ================================================== */

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm"
            >

              <p className="text-emerald-700 font-medium mb-4">
                {feedback}
              </p>

              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1"
              >

                Next question

                <FaArrowLeft
                  size={18}
                />

              </button>

            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Step2Interview;
