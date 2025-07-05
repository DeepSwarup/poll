import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Welcome() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleContinue = () => {
    if (selectedRole === 'student') {
      navigate('/student');
    } else if (selectedRole === 'teacher') {
      navigate('/teacher');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="mb-2">
        <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          ✨ Intervue Poll
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-2">
        Welcome to the <span className="font-bold">Live Polling System</span>
      </h1>
      <p className="text-gray-500 text-center mb-8">
        Please select the role that best describes you to begin using the live polling system
      </p>

      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <button
          className={`rounded-lg px-6 py-5 text-left w-72 border-2 ${
            selectedRole === 'student'
              ? 'border-indigo-500'
              : 'border-gray-200'
          } hover:shadow-md focus:outline-none`}
          onClick={() => setSelectedRole('student')}
        >
          <p className="font-semibold text-lg mb-1">I’m a Student</p>
          <p className="text-sm text-gray-600">
            Lorem Ipsum is simply dummy text of the printing and typesetting industry
          </p>
        </button>

        <button
          className={`rounded-lg px-6 py-5 text-left w-72 border-2 ${
            selectedRole === 'teacher'
              ? 'border-indigo-500'
              : 'border-gray-200'
          } hover:shadow-md focus:outline-none`}
          onClick={() => setSelectedRole('teacher')}
        >
          <p className="font-semibold text-lg mb-1">I’m a Teacher</p>
          <p className="text-sm text-gray-600">
            Submit answers and view live poll results in real-time.
          </p>
        </button>
      </div>

      <button
        className={`bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-10 py-3 rounded-full shadow-md transition ${
          selectedRole ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleContinue}
        disabled={!selectedRole}
      >
        Continue
      </button>
    </div>
  );
}

export default Welcome;
