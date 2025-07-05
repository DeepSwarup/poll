import { useEffect } from 'react';

function KickedOverlay({ onClose }) {
  useEffect(() => {
    // Prevent default page behavior (e.g., refreshing won’t clear this)
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">You Have Been Removed</h2>
        <p className="text-gray-700 mb-4">
          You have been kicked out of the session by the teacher. Please contact the teacher or administrator for further assistance.
        </p>
        <button
          onClick={() => {
            onClose();
            window.location.href = '/'; // Redirect to home or login page
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
}

export default KickedOverlay;