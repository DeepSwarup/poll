import { useState, useEffect } from 'react';
import socket from '../utils/socket';
import KickedOverlay from './KickedOverlay';

function ChatComponent({ userRole, userName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    socket.on('newMessage', (message) => {
      console.log(`${userRole} received message:`, message);
      setMessages((prev) => [...prev, message]);
    });
    socket.on('participantUpdate', (participantsList) => {
      console.log(`${userRole} received participant update:`, participantsList);
      setParticipants(participantsList);
    });
    socket.on('kicked', () => {
      console.log(`${userRole} has been kicked`);
      setIsKicked(true);
    });

    socket.emit('registerParticipant', userRole, userName);

    return () => {
      socket.off('newMessage');
      socket.off('participantUpdate');
      socket.off('kicked');
    };
  }, [userRole, userName]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('sendMessage', { text: newMessage, sender: userName });
      setNewMessage('');
    }
  };

  const togglePopup = () => setIsPopupOpen(!isPopupOpen);
  const kickParticipant = (participantId) => {
    if (window.confirm('Are you sure you want to kick this participant?')) {
      socket.emit('kickParticipant', participantId);
    }
  };

  const handleCloseKicked = () => {
    setIsKicked(false);
  };

  return (
    <>
      <button
        onClick={togglePopup}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none"
        aria-label="Toggle Chat and Participants"
      >
        💬
      </button>
      {isPopupOpen && (
        <div className="fixed bottom-16 right-4 w-100 bg-white p-4 rounded-lg shadow-xl border border-gray-300 z-50">
          <div className="flex justify-between items-center mb-2">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-t-lg ${
                  activeTab === 'chat' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Chat
              </button>
              {userRole === 'teacher' && (
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`px-4 py-2 rounded-t-lg ${
                    activeTab === 'participants' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Participants
                </button>
              )}
            </div>
            <button
              onClick={togglePopup}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close Popup"
            >
              ✕
            </button>
          </div>
          <div className="h-80 overflow-y-auto mb-2 border-b border-gray-200">
            {activeTab === 'chat' && (
              <>
                <div className="h-60 overflow-y-auto mb-2 space-y-2">
                  {messages.map((msg, index) => {
                    const isCurrentUser = msg.sender === userName || (userRole === 'teacher' && msg.sender === 'Teacher');
                    return (
                      <div
                        key={index}
                        className={`max-w-[70%] p-2 rounded-lg ${
                          isCurrentUser
                            ? 'bg-purple-100 text-right ml-auto'
                            : 'bg-gray-100 text-left'
                        }`}
                      >
                        <p className="text-sm inline-block">
                          {msg.text}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()} - {msg.sender}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </form>
              </>
            )}
            {activeTab === 'participants' && userRole === 'teacher' && (
              <div className="max-h-40 overflow-y-auto">
                {participants
                  .filter(p => p.role === 'student')
                  .map((participant) => (
                    <div key={participant.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">{participant.name}</span>
                      <button
                        onClick={() => kickParticipant(participant.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Kick Out
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      {isKicked && <KickedOverlay onClose={handleCloseKicked} />}
    </>
  );
}

export default ChatComponent;