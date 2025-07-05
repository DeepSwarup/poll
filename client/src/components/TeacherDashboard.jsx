import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import PollForm from './PollForm';
import PollResults from './PollResults';
import ChatComponent from './ChatComponent';

function TeacherDashboard() {
  const [poll, setPoll] = useState(null);
  const [userName] = useState('Teacher');
  const navigate = useNavigate();

  useEffect(() => {
    const handleNewPoll = (newPoll) => {
      console.log('Teacher received new poll:', newPoll);
      setPoll(newPoll);
    };

    const handlePollUpdate = (updatedPoll) => {
      console.log('Teacher poll update:', updatedPoll);
      setPoll(updatedPoll);
    };

    const handlePollEnded = (endedPoll) => {
      console.log('Teacher poll ended:', endedPoll);
      setPoll(endedPoll);
    };

    socket.on('newPoll', handleNewPoll);
    socket.on('teacherPollUpdate', handlePollUpdate);
    socket.on('pollEnded', handlePollEnded);

    socket.emit('registerParticipant', 'teacher', userName);

    return () => {
      socket.off('newPoll', handleNewPoll);
      socket.off('teacherPollUpdate', handlePollUpdate);
      socket.off('pollEnded', handlePollEnded);
    };
  }, [userName]);

  const handleEndPoll = () => {
    console.log('Teacher requesting to end poll');
    socket.emit('endPoll');
  };

  const handleViewHistory = () => {
    navigate('/poll-history');
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-xl font-semibold text-purple-600 mb-4">Teacher Dashboard</h1>
      <button
        onClick={handleViewHistory}
        className="w-full mb-4 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        View Poll History
      </button>
      <PollForm />
      {poll && (
        <div className="mt-4">
          <PollResults poll={poll} hasSubmitted={true} />
          <button
            onClick={handleEndPoll}
            className="w-full mt-4 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            End Poll
          </button>
        </div>
      )}
      <ChatComponent userRole="teacher" userName={userName} />
    </div>
  );
}

export default TeacherDashboard;