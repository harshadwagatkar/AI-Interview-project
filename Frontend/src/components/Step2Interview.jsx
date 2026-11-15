import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";

const Step2Interview = ({ interviewData, onFinish }) => {
  const { interviewId, questions, userName } = interviewData;

  // ============================================================
  // STATES
  // ============================================================

  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const [timeLeft, setTimeLeft] = useState(
    questions[0]?.timeLimit || 60
  );

  const [isMicOn, setIsMicOn] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceGender, setVoiceGender] = useState("female");

  const [subtitle, setSubtitle] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [speechError, setSpeechError] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // IMPORTANT:
  // true only when AI has finished asking current question.
  const [questionReady, setQuestionReady] = useState(false);

  // ============================================================
  // REFS
  // ============================================================

  const videoRef = useRef(null);

  const recognitionRef = useRef(null);

  const recognitionRunningRef = useRef(false);

  // Whether USER wants microphone ON
  const shouldListenRef = useRef(false);

  // Whether AI speech is currently running
  const speechRunningRef = useRef(false);

  const restartTimeoutRef = useRef(null);

  const submittingRef = useRef(false);

  const answerRef = useRef("");

  const speechSessionRef = useRef(0);

  // ============================================================
  // CURRENT QUESTION
  // ============================================================

  const currentQuestion = questions[currentIndex];

  const videoSource =
    voiceGender === "male" ? maleVideo : femaleVideo;

  // ============================================================
  // KEEP ANSWER REF UPDATED
  // ============================================================

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // ============================================================
  // LOAD SPEECH SYNTHESIS VOICES
  // ============================================================

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices || voices.length === 0) {
        return;
      }

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

      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ============================================================
  // SPEECH RECOGNITION SETUP
  // ============================================================

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);

      setSpeechError(
        "Voice recognition is not supported in this browser. Please use Google Chrome."
      );

      return;
    }

    setIsSpeechSupported(true);

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // ==========================================================
    // ON START
    // ==========================================================

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");

      recognitionRunningRef.current = true;

      if (shouldListenRef.current) {
        setIsMicOn(true);
      }

      setSpeechError("");
    };

    // ==========================================================
    // ON RESULT
    // ==========================================================

    recognition.onresult = (event) => {
      let finalText = "";

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
        }
      }

      if (finalText.trim()) {
        const newText = finalText.trim();

        console.log("Recognized:", newText);

        setAnswer((previous) => {
          const oldText = previous.trim();

          if (!oldText) {
            return newText;
          }

          return `${oldText} ${newText}`;
        });
      }
    };

    // ==========================================================
    // ON ERROR
    // ==========================================================

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
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
            "No speech detected. Recognition will restart."
          );
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
          console.log("Recognition aborted.");
          break;

        default:
          setSpeechError(
            `Speech recognition error: ${event.error}`
          );
      }
    };

    // ==========================================================
    // ON END
    // ==========================================================

    recognition.onend = () => {
      console.log("🎤 Speech recognition ended");

      recognitionRunningRef.current = false;

      /*
       * Chrome can automatically stop SpeechRecognition.
       *
       * If user still wants mic ON,
       * restart it automatically.
       */

      if (
        shouldListenRef.current &&
        !speechRunningRef.current &&
        !submittingRef.current
      ) {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }

        restartTimeoutRef.current = setTimeout(() => {
          if (
            shouldListenRef.current &&
            !speechRunningRef.current &&
            !recognitionRunningRef.current
          ) {
            startRecognition();
          }
        }, 300);

        return;
      }

      if (!shouldListenRef.current) {
        setIsMicOn(false);
      }
    };

    recognitionRef.current = recognition;

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      shouldListenRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      try {
        recognition.stop();
      } catch (error) {
        console.log(
          "Recognition cleanup:",
          error
        );
      }

      recognitionRef.current = null;
    };
  }, []);

  // ============================================================
  // START RECOGNITION
  // ============================================================

  const startRecognition = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setSpeechError(
        "Speech recognition is not available."
      );

      return;
    }

    if (
      speechRunningRef.current ||
      isAIPlaying ||
      submittingRef.current
    ) {
      return;
    }

    if (recognitionRunningRef.current) {
      return;
    }

    shouldListenRef.current = true;

    setSpeechError("");

    try {
      recognition.start();

      console.log("🎤 Starting recognition...");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error(
          "Error starting recognition:",
          error
        );

        setSpeechError(
          "Could not start microphone. Please try again."
        );
      }
    }
  };

  // ============================================================
  // STOP RECOGNITION
  // ============================================================

  const stopRecognition = () => {
    // VERY IMPORTANT:
    // This prevents onend from automatically restarting.
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
    } catch (error) {
      console.log(
        "Recognition stop error:",
        error
      );
    }

    recognitionRunningRef.current = false;
  };

  // ============================================================
  // REQUEST MICROPHONE PERMISSION
  // ============================================================

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      console.log(
        "Microphone permission granted."
      );

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      return true;
    } catch (error) {
      console.error(
        "Microphone permission error:",
        error
      );

      setSpeechError(
        "Microphone permission denied. Please allow microphone access in your browser."
      );

      return false;
    }
  };

  // ============================================================
  // START MIC
  // ============================================================

  const startMic = async () => {
    if (!isSpeechSupported) {
      setSpeechError(
        "Please use Google Chrome for voice recognition."
      );

      return;
    }

    /*
     * Mic cannot be started until AI has finished
     * asking the current question.
     */
    if (!questionReady) {
      return;
    }

    if (
      isAIPlaying ||
      speechRunningRef.current ||
      submittingRef.current
    ) {
      return;
    }

    const permission =
      await requestMicrophonePermission();

    if (!permission) {
      return;
    }

    shouldListenRef.current = true;

    startRecognition();
  };

  // ============================================================
  // STOP MIC
  // ============================================================

  const stopMic = () => {
    stopRecognition();
  };

  // ============================================================
  // TOGGLE MIC
  // ============================================================

  const toggleMic = async () => {
    if (
      isMicOn ||
      shouldListenRef.current
    ) {
      stopMic();
    } else {
      await startMic();
    }
  };

  // ============================================================
  // SPEAK TEXT
  // ============================================================

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (
        !("speechSynthesis" in window) ||
        !selectedVoice
      ) {
        resolve();
        return;
      }

      // AI speaking means microphone must stop.
      stopMic();

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

      utterance.onstart = () => {
        console.log("🔊 AI started speaking");

        setIsAIPlaying(true);

        videoRef.current
          ?.play()
          .catch(() => {});
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

        setSubtitle("");

        resolve();
      };

      setSubtitle(text);

      window.speechSynthesis.speak(
        utterance
      );
    });
  };

  // ============================================================
  // INTRO + QUESTION SPEECH
  // ============================================================

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }

    let cancelled = false;

    const session =
      ++speechSessionRef.current;

    const runInterviewSpeech = async () => {
      // ========================================================
      // INTRO
      // ========================================================

      if (isIntroPhase) {
        setQuestionReady(false);

        await speakText(
          `Hello ${userName}, welcome to the AI Smart Interview. I will be asking you a series of questions. Please answer them to the best of your ability. Let's get started!`
        );

        if (
          cancelled ||
          session !== speechSessionRef.current
        ) {
          return;
        }

        await speakText(
          `I will ask you a few questions. Just answer naturally and confidently. You can also type your answer in the text box below. Let's begin!`
        );

        if (
          cancelled ||
          session !== speechSessionRef.current
        ) {
          return;
        }

        setIsIntroPhase(false);

        return;
      }

      // ========================================================
      // CURRENT QUESTION
      // ========================================================

      if (!currentQuestion) {
        return;
      }

      /*
       * RESET ALL STATES FOR NEW QUESTION
       */

      setQuestionReady(false);

      setIsMicOn(false);

      setAnswer("");
      answerRef.current = "";

      setFeedback("");

      shouldListenRef.current = false;

      recognitionRunningRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(
          restartTimeoutRef.current
        );

        restartTimeoutRef.current = null;
      }

      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.log(error);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      if (
        cancelled ||
        session !== speechSessionRef.current
      ) {
        return;
      }

      // ========================================================
      // LAST QUESTION MESSAGE
      // ========================================================

      if (
        currentIndex ===
        questions.length - 1
      ) {
        await speakText(
          "Alright, this one might be a bit more challenging. Please take your time and answer thoughtfully."
        );

        if (
          cancelled ||
          session !== speechSessionRef.current
        ) {
          return;
        }
      }

      // ========================================================
      // SPEAK QUESTION
      // ========================================================

      await speakText(
        currentQuestion.question
      );

      if (
        cancelled ||
        session !== speechSessionRef.current
      ) {
        return;
      }

      /*
       * ========================================================
       * NEW QUESTION IS READY
       * ========================================================
       *
       * The microphone button is now enabled.
       *
       * Mic starts OFF.
       */

      setQuestionReady(true);

      setIsMicOn(false);

      shouldListenRef.current = false;

      console.log(
        `Question ${currentIndex + 1} ready`
      );
    };

    runInterviewSpeech();

    return () => {
      cancelled = true;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [
    selectedVoice,
    isIntroPhase,
    currentIndex,
  ]);

  // ============================================================
  // RESET TIMER FOR NEW QUESTION
  // ============================================================

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

  // ============================================================
  // TIMER
  // ============================================================

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
    currentQuestion,
  ]);

  // ============================================================
  // AUTO SUBMIT WHEN TIMER REACHES ZERO
  // ============================================================

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !isIntroPhase &&
      !feedback &&
      !isSubmitting &&
      questionReady
    ) {
      submitAnswer();
    }
  }, [
    timeLeft,
    isIntroPhase,
    feedback,
    isSubmitting,
    questionReady,
  ]);

  // ============================================================
  // SUBMIT ANSWER
  // ============================================================

  const submitAnswer = async () => {
    if (
      submittingRef.current ||
      isSubmitting ||
      !currentQuestion
    ) {
      return;
    }

    submittingRef.current = true;

    // Disable current question controls
    setQuestionReady(false);

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

      // Speak feedback
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

      stopMic();
    }
  };

  // ============================================================
  // NEXT QUESTION
  // ============================================================

  const handleNext = () => {
    console.log(
      "Going to next question..."
    );

    /*
     * ========================================================
     * COMPLETE RESET
     * ========================================================
     */

    stopMic();

    shouldListenRef.current = false;

    recognitionRunningRef.current = false;

    speechRunningRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(
        restartTimeoutRef.current
      );

      restartTimeoutRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsAIPlaying(false);

    // Clear previous answer
    setAnswer("");
    answerRef.current = "";

    // Clear previous feedback
    setFeedback("");

    // New question is NOT ready yet
    setQuestionReady(false);

    // Mic must start OFF
    setIsMicOn(false);

    /*
     * ========================================================
     * FINISH INTERVIEW
     * ========================================================
     */

    if (
      currentIndex + 1 >=
      questions.length
    ) {
      finishInterview();
      return;
    }

    /*
     * ========================================================
     * MOVE TO NEXT QUESTION
     * ========================================================
     */

    setCurrentIndex(
      (previous) => previous + 1
    );
  };

  // ============================================================
  // FINISH INTERVIEW
  // ============================================================

  const finishInterview = async () => {
    stopMic();

    shouldListenRef.current = false;

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

  // ============================================================
  // FINAL CLEANUP
  // ============================================================

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
          console.log(error);
        }
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">

      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">

        {/* ======================================================
            LEFT / VIDEO SECTION
        ====================================================== */}

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

          {/* TIMER CARD */}

          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">

            <div className="flex justify-between items-center">

              <span className="text-sm text-gray-500">
                Interview Status
              </span>

              {isAIPlaying && (
                <span className="text-sm font-semibold text-blue-600">
                  AI is speaking...
                </span>
              )}

              {!isAIPlaying && isMicOn && (
                <span className="text-sm font-semibold text-emerald-600">
                  Listening...
                </span>
              )}

              {!isAIPlaying &&
                !isMicOn &&
                questionReady &&
                !feedback && (
                  <span className="text-sm font-semibold text-gray-500">
                    Mic is OFF
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

        {/* ======================================================
            RIGHT / QUESTION SECTION
        ====================================================== */}

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

              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed">
                {currentQuestion?.question}
              </div>

            </div>
          )}

          {/* SPEECH ERROR */}

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

          {!isIntroPhase && (
            <textarea
              placeholder={
                isMicOn
                  ? "Speak your answer... your words will appear here."
                  : "Click the microphone to speak, or type your answer here..."
              }
              onChange={(event) => {
                setAnswer(event.target.value);

                answerRef.current =
                  event.target.value;
              }}
              value={answer}
              disabled={
                isSubmitting ||
                isAIPlaying ||
                !questionReady
              }
              className="flex-1 min-h-[250px] bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800 disabled:opacity-70"
            />
          )}

          {/* ==================================================
              MICROPHONE + SUBMIT CONTROLS
              
              IMPORTANT:
              These controls are NOT inside !feedback.
              
              Therefore, moving from Q4 -> Q5 will not
              accidentally hide the microphone.
          ================================================== */}

          {!isIntroPhase &&
            currentQuestion && (
              <div className="flex items-center gap-4 mt-6">

                {/* MICROPHONE BUTTON */}

                <motion.button
                  type="button"
                  onClick={toggleMic}
                  disabled={
                    isAIPlaying ||
                    isSubmitting ||
                    !isSpeechSupported ||
                    !questionReady
                  }
                  whileTap={{
                    scale: 0.9,
                  }}
                  title={
                    isMicOn
                      ? "Turn microphone OFF"
                      : "Turn microphone ON"
                  }
                  className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-lg transition ${
                    isMicOn
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-black hover:bg-gray-800"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >

                  {isMicOn ? (
                    <FaMicrophone size={20} />
                  ) : (
                    <FaMicrophoneSlash
                      size={20}
                    />
                  )}

                </motion.button>

                {/* MIC STATUS */}

                <div className="hidden sm:block min-w-[120px]">

                  <p
                    className={`text-sm font-medium ${
                      isMicOn
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {isAIPlaying
                      ? "AI speaking..."
                      : !questionReady
                      ? "Please wait..."
                      : isMicOn
                      ? "Microphone ON"
                      : "Microphone OFF"}
                  </p>

                </div>

                {/* SUBMIT BUTTON */}

                <motion.button
                  type="button"
                  onClick={submitAnswer}
                  disabled={
                    isSubmitting ||
                    isAIPlaying ||
                    !questionReady
                  }
                  whileTap={{
                    scale: 0.97,
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >

                  {isSubmitting
                    ? "Submitting..."
                    : "Submit Answer"}

                </motion.button>

              </div>
            )}

          {/* ==================================================
              FEEDBACK
          ================================================== */}

          {feedback && (
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
                disabled={isAIPlaying}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {currentIndex + 1 >=
                questions.length
                  ? "Finish Interview"
                  : "Next Question"}

                <FaArrowRight size={18} />

              </button>

            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Step2Interview;