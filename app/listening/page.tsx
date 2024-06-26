'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from '../components/Header';

const ReadingPage = () => {
  const [paragraph, setParagraph] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('openai/gpt-4o');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechActive, setSpeechActive] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [lastChunkIndex, setLastChunkIndex] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [score, setScore] = useState(null);
  const [showScore, setShowScore] = useState(false);
  const utteranceRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const fetchVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en'));
      setVoices(englishVoices);
    };

    fetchVoices();

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = fetchVoices;
    }
  }, []);

  useEffect(() => {
    const speakParagraph = () => {
      if (!paragraph || !selectedVoice) return;

      const chunkSize = 200;
      const chunks = [];
      for (let i = 0; i < paragraph.length; i += chunkSize) {
        chunks.push(paragraph.substring(i, i + chunkSize));
      }
      chunksRef.current = chunks;

      const speakChunksSequentially = (index) => {
        if (index >= chunks.length) {
          setSpeechActive(false);
          setCurrentChunkIndex(0);
          setShowAnswers(true);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        utterance.pitch = 1;
        utterance.rate = speed;
        utterance.volume = 1;

        utterance.onstart = () => {
          setCurrentChunkIndex(index);
        };

        utterance.onend = () => {
          setLastChunkIndex(index);
          if (speechActive) {
            speakChunksSequentially(index + 1);
          }
        };

        if (speechActive && index >= lastChunkIndex) {
          window.speechSynthesis.speak(utterance);
        }

        utteranceRef.current = utterance;
      };

      setCurrentChunkIndex(lastChunkIndex);
      setSpeechActive(true);
      setShowAnswers(false); // Hide answers when speaking
      speakChunksSequentially(lastChunkIndex);
    };

    if (speechActive) {
      speakParagraph();
    }

  }, [paragraph, selectedVoice, speechActive, lastChunkIndex, speed]);

  const fetchReadingMaterial = async (task) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/generate-reading-material', { model, task });
      const { paragraph, questions, answers } = response.data;
      setParagraph(paragraph);
      setQuestions(questions);
      setAnswers(answers);
      setUserAnswers(new Array(questions.length).fill('')); // Initialize userAnswers
    } catch (error) {
      console.error('Error fetching listening material:', error);
    }
    setLoading(false);
  };

  const handleSelectVoice = (event) => {
    const selectedVoiceName = event.target.value;
    const voice = voices.find(voice => voice.name === selectedVoiceName);

    if (speechActive) {
      stopSpeech();
    }

    setSelectedVoice(voice);
  };

  const handleStopOrContinueSpeech = () => {
    if (speechActive) {
      stopSpeech();
    } else {
      continueSpeech();
    }
  };

  const stopSpeech = () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      window.speechSynthesis.pause();
    }
    setSpeechActive(false);
  };

  const continueSpeech = () => {
    if (lastChunkIndex < paragraph.length) {
      window.speechSynthesis.resume();
      setSpeechActive(true);
    }
  };

  const handleSpeedChange = (event) => {
    const newSpeed = parseFloat(event.target.value);
    setSpeed(newSpeed);
    if (speechActive) {
      stopSpeech();
      continueSpeech();
    }
  };

  useEffect(() => {
    const initialSpeech = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(initialSpeech);
  }, []);

  const toggleAnswers = () => {
    setShowAnswers(!showAnswers); // Toggle the state to show/hide answers
  };

  const handleAnswerChange = (questionIndex, answer) => {
    const newUserAnswers = [...userAnswers];
    newUserAnswers[questionIndex] = answer;
    setUserAnswers(newUserAnswers);
  };

  const handleSubmit = () => {
    setSubmittedAnswers(userAnswers);
    setShowAnswers(true); // Show the answers after submission

    // Calculate score
    let newScore = 0;
    userAnswers.forEach((answer, index) => {
      if (answer === answers[index]) {
        newScore += 100;
      }
    });
    setScore(newScore);
  };

  const handleShowScore = () => {
    setShowScore(true);
  };

  const getScoreColor = (score) => {
    if (score === 0) return 'text-black';
    if (score <= 200) return 'text-purple-500';
    if (score === 300) return 'text-red-500';
    if (score > 300) return 'text-green-500';
  };

  return (
    <div className="flex flex-col">
      <Header />
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">IELTS Listening Practice</h1>
        <div className="flex space-x-4">
          <button 
            onClick={() => fetchReadingMaterial('task1')} 
            disabled={loading} 
            className="bg-blue-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Task 1'}
          </button>
          <button 
            onClick={() => fetchReadingMaterial('task2')} 
            disabled={loading} 
            className="bg-blue-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Task 2'}
          </button>
          <button 
            onClick={() => fetchReadingMaterial('task3')} 
            disabled={loading} 
            className="bg-blue-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Task 3'}
          </button>
          <button 
            onClick={() => fetchReadingMaterial('task4')} 
            disabled={loading} 
            className="bg-blue-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Task 4'}
          </button>
        </div>
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Select Voice</h2>
          <select onChange={handleSelectVoice} className="px-4 py-2 rounded bg-gray-300 text-black">
            <option value="">Select a voice</option>
            {voices.map((voice, index) => (
              <option key={index} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <label htmlFor="speed" className="text-xl font-semibold text-gray-800 mb-2 block">Adjust Speed:</label>
          <input 
            type="range" 
            id="speed" 
            name="speed" 
            min="0.5" 
            max="1.8" 
            step="0.1" 
            value={speed} 
            onChange={handleSpeedChange} 
            className="w-64"
          />
          <span className="text-gray-700 ml-2">{speed.toFixed(1)}x</span>
        </div>

        <div className="mt-6">
          <button 
            onClick={handleStopOrContinueSpeech} 
            className={`px-6 py-3 rounded-md shadow-md ${speechActive ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} hover:bg-red-600 transition duration-300`}
          >
            {speechActive ? 'Stop Speaking' : 'Continue Speaking'}
          </button>
        </div>
          
        <div className="mt-6">
          <button 
            onClick={toggleAnswers} 
            className="px-6 py-3 rounded-md shadow-md bg-indigo-500 text-white hover:bg-indigo-600 transition duration-300 mt-4"
          >
            {showAnswers ? 'Hide Answers' : 'Show Answers'}
          </button>
        </div>
        
        {questions.length > 0 && (
          <div className="mt-10 max-w-3xl bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Questions</h2>
            {questions.map((questionObj, index) => (
              <div key={index} className="mb-4">
                <p className="text-gray-700">{questionObj.question}</p>
                {questionObj.options.map((option, optIndex) => (
                  <label key={optIndex} className="block text-gray-700 ml-4">
                    <input 
                      type="radio" 
                      name={`question-${index}`} 
                      value={String.fromCharCode(65 + optIndex)} // 'A', 'B', 'C', etc.
                      checked={userAnswers[index] === String.fromCharCode(65 + optIndex)} 
                      onChange={() => handleAnswerChange(index, String.fromCharCode(65 + optIndex))} 
                      className="mr-2"
                    />
                    {String.fromCharCode(65 + optIndex)}: {option}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-6">
            <button 
              onClick={handleSubmit} 
              className="px-6 py-3 rounded-md shadow-md bg-green-500 text-white hover:bg-green-600 transition duration-300"
            >
              Submit
            </button>
          </div>
        )}

        {showAnswers && submittedAnswers.length > 0 && (
          <div className="mt-10 max-w-3xl bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Submitted Answers</h2>
            {questions.map((questionObj, index) => (
              <div key={index} className="mb-4">
                <p className="text-gray-700">{questionObj.question}</p>
                <p className="text-gray-700 ml-4">Your Answer: {submittedAnswers[index]}</p>
                <p className="text-gray-700 ml-4">Correct Answer: {answers[index]}</p>
              </div>
            ))}
          </div>
        )}

        {submittedAnswers.length > 0 && (
          <div className="mt-6">
            <button 
              onClick={handleShowScore} 
              className="px-6 py-3 rounded-md shadow-md bg-yellow-500 text-white hover:bg-yellow-600 transition duration-300"
            >
              Show Score
            </button>
          </div>
        )}

        {showScore && (
          <div className={`mt-10 text-3xl font-bold ${getScoreColor(score)}`}>
            Your Score: {score}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingPage;
