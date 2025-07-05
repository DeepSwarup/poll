import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function StudentDashboard() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedName = sessionStorage.getItem('studentName');
    if (savedName) {
      navigate('/student/poll');
    }
  }, [navigate]);

  const handleContinue = () => {
    if (name.trim()) {
      sessionStorage.setItem('studentName', name);
      navigate('/student/poll');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="mb-3">
        <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          ✨ Intervue Poll
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-4">
        Let’s <span className="font-bold">Get Started</span>
      </h1>

      <p className="text-gray-500 text-center max-w-md mb-8">
        If you’re a student, you’ll be able to <span className="font-semibold text-black">submit your answers</span>, participate in live polls, and see how your responses compare with your classmates
      </p>

      <div className="flex flex-col w-full max-w-md gap-2 items-start mb-6">
        <label htmlFor="name" className="font-medium text-gray-700">
          Enter your Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Rahul Bajaj"
        />
      </div>

      <button
        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-10 py-3 rounded-full shadow-md hover:opacity-90 transition"
        onClick={handleContinue}
      >
        Continue
      </button>
    </div>
  );
}

export default StudentDashboard;
