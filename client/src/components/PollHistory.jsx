import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';

function PollHistory() {
  const [pollHistory, setPollHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('pollHistory', (history) => {
      console.log('Teacher received poll history:', history);
      setPollHistory(history);
    });

    // Initial fetch
    socket.emit('getPollHistory');

    return () => {
      socket.off('pollHistory');
    };
  }, []);

  return (
    <div className="p-4 min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Poll History</h1>
          <button
            onClick={() => navigate('/teacher')}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
        {pollHistory.length > 0 ? (
          <div className="space-y-4">
            {pollHistory.map((pastPoll, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg shadow-md border border-gray-200"
              >
                <p className="text-gray-800 font-medium">Question: {pastPoll.question}</p>
                <p className="text-gray-600 text-sm">
                  Created at: {new Date(pastPoll.createdAt).toLocaleString()}
                </p>
                {pastPoll.endedAt && (
                  <p className="text-gray-600 text-sm">
                    Ended at: {new Date(pastPoll.endedAt).toLocaleString()}
                  </p>
                )}
                <div className="mt-2 space-y-1">
                  {pastPoll.options.map((opt, idx) => {
                    const result = pastPoll.results.find((r) => r.option === opt);
                    return (
                      <p key={idx} className="text-gray-600 text-sm">
                        {String.fromCharCode(97 + idx)}. {opt} -{' '}
                        {result ? `${result.percentage}%` : '0%'}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">No poll history yet.</p>
        )}
      </div>
    </div>
  );
}

export default PollHistory;