const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();


const app = express();
const server = http.createServer(app);

// ✅ Allowed frontends: local + Vercel
const allowedOrigins = [
  'http://localhost:5173',
  'https://poll-puce-eta.vercel.app'
];

// ✅ Apply CORS to Express
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

// ✅ Setup Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ✅ Use PORT from environment or default to 3000
const PORT = process.env.PORT || 3000;

let currentPoll = null;
let pollResponses = {};
const submittedStudents = new Map();
const pollHistory = [];
const participants = new Map();
const sentPolls = new Set();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('registerParticipant', (role, name) => {
    if (role === 'student' && name) {
      let existingParticipant = Array.from(participants.entries()).find(([_, p]) => p.name === name);
      if (existingParticipant) {
        const [oldName, oldParticipant] = existingParticipant;
        if (oldParticipant.id !== socket.id) {
          if (currentPoll && pollResponses[oldParticipant.id]) {
            pollResponses[socket.id] = pollResponses[oldParticipant.id];
            delete pollResponses[oldParticipant.id];
            currentPoll.responses = { ...pollResponses };
          }
          if (submittedStudents.has(name)) {
            submittedStudents.set(name, true);
          }
          participants.delete(oldName);
        }
      }
      participants.set(name, { id: socket.id, name, role });
      io.emit('participantUpdate', Array.from(participants.values()));
    } else if (role === 'teacher') {
      socket.emit('participantUpdate', Array.from(participants.values()));
    }

    if (currentPoll && !currentPoll.ended && !sentPolls.has(`${socket.id}-${currentPoll.timer}`)) {
      const isSubmitted = role === 'student' && submittedStudents.get(name);
      socket.emit('newPoll', { ...currentPoll, initialTimer: currentPoll.timer, isSubmitted: isSubmitted || false });
      sentPolls.add(`${socket.id}-${currentPoll.timer}`);
    }

    socket.emit('pollHistory', pollHistory);
  });

  socket.emit('welcome', 'Connected to the polling server!');
  socket.emit('pollHistory', pollHistory);

  socket.on('createPoll', (pollData) => {
    const activeStudents = Array.from(participants.values()).filter(p => p.role === 'student').map(p => p.id);
    const allAnswered = activeStudents.every(studentId => pollResponses[studentId] !== undefined);

    if (!currentPoll || allAnswered) {
      const newPoll = { ...pollData, responses: {}, results: [], ended: false, initialTimer: pollData.timer, createdAt: new Date().toISOString() };
      pollHistory.push(newPoll);
      currentPoll = newPoll;
      pollResponses = {};
      submittedStudents.clear();
      sentPolls.clear();
      io.emit('newPoll', { ...currentPoll, initialTimer: currentPoll.timer, isSubmitted: false });
      io.emit('pollHistory', pollHistory);
    } else {
      socket.emit('pollCreationDenied', 'Cannot create a new poll until all students have answered the current poll.');
    }
  });

  socket.on('submitAnswer', ({ studentId, answer, socketId }) => {
    if (currentPoll && !currentPoll.ended && !pollResponses[socketId]) {
      pollResponses[socketId] = answer;

      const participant = Array.from(participants.entries()).find(([_, p]) => p.id === socketId);
      if (participant) {
        submittedStudents.set(participant[1].name, true);
      }

      currentPoll.responses = { ...pollResponses };

      const totalResponses = Object.keys(pollResponses).length;
      const optionCounts = {};
      currentPoll.options.forEach((opt) => (optionCounts[opt] = 0));
      Object.values(pollResponses).forEach((ans) => {
        optionCounts[ans] = (optionCounts[ans] || 0) + 1;
      });

      const results = currentPoll.options.map((opt) => ({
        option: opt,
        count: optionCounts[opt] || 0,
        percentage: totalResponses ? ((optionCounts[opt] || 0) / totalResponses * 100).toFixed(1) : 0,
      }));

      currentPoll.results = results;

      const historyIndex = pollHistory.findIndex(p => p.question === currentPoll.question && !p.endedAt);
      if (historyIndex !== -1) {
        pollHistory[historyIndex] = { ...currentPoll };
      }

      socket.emit('personalPollUpdate', { ...currentPoll, initialTimer: currentPoll.timer, isSubmitted: true });
      socket.broadcast.emit('teacherPollUpdate', { ...currentPoll, initialTimer: currentPoll.timer });
      io.emit('pollHistory', pollHistory);

      const activeStudents = Array.from(participants.values()).filter(p => p.role === 'student').map(p => p.id);
      if (activeStudents.every(studentId => pollResponses[studentId] !== undefined)) {
        io.emit('allAnswered', { poll: currentPoll });
      }
    }
  });

  socket.on('endPoll', () => {
    if (currentPoll) {
      currentPoll.ended = true;

      const historyIndex = pollHistory.findIndex(p => p.question === currentPoll.question && !p.endedAt);
      if (historyIndex !== -1) {
        pollHistory[historyIndex] = { ...currentPoll, endedAt: new Date().toISOString() };
      }

      io.emit('pollEnded', { ...currentPoll, initialTimer: 0, isSubmitted: true });
      io.emit('pollHistory', pollHistory);

      const activeStudents = Array.from(participants.values()).filter(p => p.role === 'student').map(p => p.id);
      const allAnswered = activeStudents.every(studentId => pollResponses[studentId] !== undefined);

      if (allAnswered) {
        currentPoll = null;
        pollResponses = {};
        submittedStudents.clear();
        sentPolls.clear();
      }
    }
  });

  socket.on('sendMessage', (message) => {
    io.emit('newMessage', { ...message, timestamp: new Date().toISOString(), id: socket.id });
  });

  socket.on('kickParticipant', (participantId) => {
    const participant = Array.from(participants.values()).find(p => p.id === participantId);
    if (participant) {
      participants.delete(participant.name);
      io.emit('participantUpdate', Array.from(participants.values()));
      io.to(participantId).emit('kicked', 'You have been removed from the session.');
      io.sockets.sockets.get(participantId)?.disconnect(true);
    }
  });

  socket.on('getPollHistory', () => {
    socket.emit('pollHistory', pollHistory);
  });

  socket.on('disconnect', () => {
    for (const [name, participant] of participants) {
      if (participant.id === socket.id) {
        participants.delete(name);
        break;
      }
    }
    io.emit('participantUpdate', Array.from(participants.values()));
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
