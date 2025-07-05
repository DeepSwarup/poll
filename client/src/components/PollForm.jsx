import { useState, useEffect } from 'react';
import socket from '../utils/socket';

function PollForm() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: null }]);
  const [timer, setTimer] = useState(60);
  const [canCreatePoll, setCanCreatePoll] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPollStatus, setCurrentPollStatus] = useState(null);

  useEffect(() => {
    const handlePollUpdate = (poll) => {
      setCurrentPollStatus(poll);
    };

    const handleAllAnswered = () => {
      setCanCreatePoll(true);
      setErrorMessage('');
    };

    const handlePollEnded = () => {
      setCanCreatePoll(false);
    };

    const handleParticipantUpdate = (participantsList) => {
      const activeStudents = participantsList.filter(p => p.role === 'student').length;
      if (currentPollStatus && Object.keys(currentPollStatus.responses || {}).length < activeStudents) {
        setCanCreatePoll(false);
      } else {
        setCanCreatePoll(true);
      }
    };

    socket.on('teacherPollUpdate', handlePollUpdate);
    socket.on('allAnswered', handleAllAnswered);
    socket.on('pollEnded', handlePollEnded);
    socket.on('participantUpdate', handleParticipantUpdate);

    return () => {
      socket.off('teacherPollUpdate', handlePollUpdate);
      socket.off('allAnswered', handleAllAnswered);
      socket.off('pollEnded', handlePollEnded);
      socket.off('participantUpdate', handleParticipantUpdate);
    };
  }, [currentPollStatus]);

  useEffect(() => {
    socket.on('pollCreationDenied', (message) => {
      setErrorMessage(message);
      setCanCreatePoll(false);
      setTimeout(() => setErrorMessage(''), 3000);
    });
  }, []);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: '', isCorrect: null }]);
    }
  };

  const handleOptionChange = (index, field, value) => {
    const updated = [...options];
    if (field === 'isCorrect') {
      updated[index].isCorrect = value;
    } else {
      updated[index][field] = value;
    }
    setOptions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validOptions = options.filter(opt => opt.text.trim() !== '');
    const correctAnswers = validOptions.filter(opt => opt.isCorrect === 'yes').map(opt => opt.text);

    if (question.trim() && validOptions.length >= 2 && correctAnswers.length >= 1) {
      socket.emit('createPoll', {
        question: question.trim(),
        options: validOptions.map(opt => opt.text),
        correctAnswers,
        timer,
      });
      setQuestion('');
      setOptions([{ text: '', isCorrect: null }]);
      setTimer(60);
    } else {
      alert('Please enter a question, at least two options, and mark at least one as correct.');
    }
  };

  const timerOptions = [15, 30, 45, 60, 90, 120];

  return (
    <div className="min-h-screen bg-white p-8 pb-24 relative">
      <div className="mb-6">
        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">✨ Intervue Poll</span>
        <h1 className="text-3xl font-semibold mt-4 mb-1">Let’s <span className="font-bold">Get Started</span></h1>
        <p className="text-gray-500 max-w-md">
          You’ll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-lg font-medium text-gray-800">Enter your question</label>
            <select
              value={timer}
              onChange={(e) => setTimer(Number(e.target.value))}
              disabled={!canCreatePoll}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {timerOptions.map(sec => (
                <option key={sec} value={sec}>{sec} seconds</option>
              ))}
            </select>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={100}
            disabled={!canCreatePoll}
            rows={3}
            placeholder="Type your question..."
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-right text-sm text-gray-400">{question.length}/100</p>
        </div>

        {/* Options */}
        <div>
          <p className="text-lg font-medium text-gray-800 mb-2">Edit Options</p>
          {options.map((opt, index) => (
            <div key={index} className="flex items-start gap-4 mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center mt-2">{index + 1}</div>
              <div className="flex-1">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                  disabled={!canCreatePoll}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-sm text-gray-600 mb-1">Is it Correct?</p>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={opt.isCorrect === 'yes'}
                    onChange={() => handleOptionChange(index, 'isCorrect', 'yes')}
                    disabled={!canCreatePoll}
                    className="text-purple-600"
                  />
                  <span className="text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={opt.isCorrect === 'no'}
                    onChange={() => handleOptionChange(index, 'isCorrect', 'no')}
                    disabled={!canCreatePoll}
                  />
                  <span className="text-gray-700">No</span>
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddOption}
            disabled={!canCreatePoll || options.length >= 6}
            className="border border-purple-600 text-purple-600 px-4 py-1 rounded mt-2 hover:bg-purple-50 transition-colors text-sm"
          >
            + Add More option
          </button>
        </div>

        {errorMessage && (
          <p className="text-red-500 text-sm">{errorMessage}</p>
        )}
      </form>

      {/* Sticky Submit Button */}
   <div className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-4 flex justify-center">
  <button
    onClick={handleSubmit}
    disabled={!canCreatePoll}
    className="w-full max-w-xs bg-purple-600 text-white font-semibold py-3 rounded-full hover:bg-purple-700 transition-colors disabled:bg-gray-400"
  >
    Ask Question
  </button>
</div>

    </div>
  );
}

export default PollForm;
