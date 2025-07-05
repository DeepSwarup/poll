import { useEffect, useState } from 'react';

function PollResults({ poll, hasSubmitted }) {
  const [results, setResults] = useState(poll?.results || []);

  useEffect(() => {
    setResults(poll?.results || []);
  }, [poll]);

  if (!poll) return <div className="p-4 text-center text-gray-600">Wait for the teacher to ask a new question...</div>;

  const displayResults = poll.ended && results.length === 0 ? [] : results;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-700 text-white p-3 flex justify-between items-center">
        <span>Question {poll.createdAt ? new Date(poll.createdAt).toLocaleTimeString() : '1'}</span>
        <span className="text-red-400 font-medium">
          {poll.timer >= 0 ? `⏰ ${Math.floor(poll.timer / 60)}:${(poll.timer % 60).toString().padStart(2, '0')}` : '⏰ 00:00'}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{poll.question}</h2>
        {displayResults.length > 0 ? (
          displayResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="w-1/4 text-sm text-gray-700">{String.fromCharCode(97 + index)}. {result.option}</span>
              <div className="w-2/4 bg-gray-200 rounded-full h-5">
                <div
                  className="bg-purple-600 h-5 rounded-full transition-all duration-300"
                  style={{ width: `${result.percentage}%` }}
                ></div>
              </div>
              <span className="w-1/4 text-sm text-gray-700 text-right">{result.percentage}%</span>
            </div>
          ))
        ) : poll.ended ? (
          <p className="text-gray-500 text-center">Poll ended. Waiting for the next question...</p>
        ) : (
          <p className="text-gray-500 text-center">No responses yet. Waiting for students...</p>
        )}
        {hasSubmitted && (
          <p className="mt-2 text-gray-500 text-center">Poll ended. Waiting for the next question...</p>
        )}
      </div>
    </div>
  );
}

export default PollResults;