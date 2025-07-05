import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import PollResults from './PollResults';
import ChatComponent from './ChatComponent';

function PollScreen() {
  const [poll, setPoll] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [studentId] = useState(
    sessionStorage.getItem('studentId') || `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [submittedAnswer, setSubmittedAnswer] = useState(sessionStorage.getItem('submittedAnswer') || null);
  const [lastResults, setLastResults] = useState(null);
  const [studentName] = useState(sessionStorage.getItem('studentName') || 'Anonymous');
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const socketIdRef = useRef(sessionStorage.getItem('socketId') || null); // Persist socketId
  const lastPollTimestampRef = useRef(null); // Track last poll's createdAt

  useEffect(() => {
    // Persist studentId, studentName, and socketId if not already set
    if (!sessionStorage.getItem('studentId')) {
      sessionStorage.setItem('studentId', studentId);
    }
    if (!sessionStorage.getItem('studentName')) {
      sessionStorage.setItem('studentName', studentName);
    }

    // Set and persist socketId on initial connect and update on reconnection
    const setSocketId = () => {
      if (socket.id && (!socketIdRef.current || socketIdRef.current !== socket.id)) {
        socketIdRef.current = socket.id;
        sessionStorage.setItem('socketId', socketIdRef.current);
        console.log('Socket ID updated and persisted:', socketIdRef.current);
      }
    };
    setSocketId();
    socket.on('connect', setSocketId);

    const handleNewPoll = (newPoll) => {
      console.log('Received new poll on student dashboard:', newPoll);
      if (newPoll) {
        setPoll(newPoll);
        // Check if this student has submitted for this specific poll using createdAt
        const hasSubmittedForThisPoll = 
          submittedAnswer && newPoll.responses[socketIdRef.current] && 
          lastPollTimestampRef.current === newPoll.createdAt;
        if (hasSubmittedForThisPoll) {
          setSubmittedAnswer(newPoll.responses[socketIdRef.current] || submittedAnswer);
          setLastResults(newPoll.results || []);
        } else {
          setSelectedAnswer('');
          setSubmittedAnswer(null);
          setLastResults(null);
          setTimeLeft(newPoll.initialTimer || 0);
          lastPollTimestampRef.current = newPoll.createdAt; // Update last poll timestamp
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              console.log('Timer tick:', prev - 1);
              if (prev <= 1) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    };

    const handlePollEnded = (endedPoll) => {
      console.log('Poll ended on student dashboard:', endedPoll);
      if (endedPoll) {
        setPoll(endedPoll);
        setTimeLeft(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setLastResults(endedPoll.results || []);
        if (submittedAnswer) {
          sessionStorage.setItem('submittedAnswer', submittedAnswer);
          sessionStorage.setItem('lastSubmittedPoll', endedPoll.question); // Track last poll
        }
      }
    };

    socket.on('newPoll', handleNewPoll);
    socket.on('personalPollUpdate', (updatedPoll) => {
      console.log('Received personal poll update on student dashboard:', updatedPoll);
      if (updatedPoll.responses[socketIdRef.current]) {
        setPoll(updatedPoll);
        setSubmittedAnswer(updatedPoll.responses[socketIdRef.current]);
        setLastResults(updatedPoll.results || []);
        sessionStorage.setItem('submittedAnswer', updatedPoll.responses[socketIdRef.current]);
        sessionStorage.setItem('lastSubmittedPoll', updatedPoll.question);
      }
    });
    socket.on('pollEnded', handlePollEnded);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      socket.off('connect', setSocketId);
      socket.off('newPoll', handleNewPoll);
      socket.off('personalPollUpdate');
      socket.off('pollEnded', handlePollEnded);
    };
  }, [studentId, studentName]);

  const handleSubmit = () => {
    if (selectedAnswer && timeLeft > 0 && socketIdRef.current) {
      socket.emit('submitAnswer', { studentId, answer: selectedAnswer, socketId: socketIdRef.current });
      setSubmittedAnswer(selectedAnswer);
      sessionStorage.setItem('submittedAnswer', selectedAnswer);
      sessionStorage.setItem('lastSubmittedPoll', poll.question); // Track current poll
      setSelectedAnswer('');
      setLastResults(poll.results || []);
    } else {
      console.log('Submit failed - selectedAnswer:', selectedAnswer, 'timeLeft:', timeLeft, 'socketId:', socketIdRef.current);
    }
  };

  const hasSubmitted = !!submittedAnswer;

  if (!poll || (poll.ended && timeLeft === 0)) {
    console.log('No active poll or poll ended, showing wait message');
    return (
      <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
        <div className="p-4 text-center text-gray-600">
          Wait for the teacher to ask a new question...
        </div>
        <ChatComponent userRole="student" userName={studentName} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <PollResults
        poll={{
          ...poll,
          timer: timeLeft,
          results: hasSubmitted ? (lastResults || poll.results) : poll.results,
        }}
        hasSubmitted={hasSubmitted}
      />
      {!hasSubmitted && timeLeft > 0 && (
        <div className="mt-4 space-y-3">
          {poll.options.map((opt, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(opt)}
              className={`w-full p-3 border rounded-lg text-left transition-colors ${
                selectedAnswer === opt
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {String.fromCharCode(97 + index)}. {opt}
            </button>
          ))}
          <button
            onClick={handleSubmit}
            className="w-full mt-4 p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
            disabled={!selectedAnswer || timeLeft === 0 || !socketIdRef.current}
          >
            Submit Answer
          </button>
        </div>
      )}
      {hasSubmitted && (
        <p className="mt-4 text-center text-gray-700 font-medium">
          Your response: <span className="text-purple-600 font-bold">{submittedAnswer}</span>
          <br />
          <span className="text-gray-500">Poll ended. Waiting for the next question...</span>
        </p>
      )}
      <ChatComponent userRole="student" userName={studentName} />
    </div>
  );
}

export default PollScreen;