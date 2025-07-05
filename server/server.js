const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
//   cors: { origin: "http://localhost:5173" }
  cors: { origin: "https://poll-puce-eta.vercel.app/" }
});

const PORT = "https://poll-7z60.onrender.com/" || 3000;
let currentPoll = null;
let pollResponses = {}; // Map socketId to answer
const submittedStudents = new Map(); // Map student name to submitted status
const pollHistory = []; // Store all polls with their results
const participants = new Map(); // Maps name to { id: socketId, name, role }
const sentPolls = new Set(); // Track sent poll instances per socket

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
            console.log(`Transferred response from ${oldParticipant.id} to ${socket.id} for ${name}`);
          }
          if (submittedStudents.has(name)) {
            submittedStudents.set(name, true); // Retain submitted status
          }
          participants.delete(oldName);
        }
      }
      participants.set(name, { id: socket.id, name, role });
      console.log(`Registered ${role} ${name} with socket ${socket.id}`);
      io.emit('participantUpdate', Array.from(participants.values()));
    } else if (role === 'teacher') {
      socket.emit('participantUpdate', Array.from(participants.values()));
      console.log(`Registered teacher with socket ${socket.id}`);
    }
    if (currentPoll && !currentPoll.ended && !sentPolls.has(`${socket.id}-${currentPoll.timer}`)) {
      const isSubmitted = role === 'student' && submittedStudents.get(name);
      socket.emit('newPoll', { ...currentPoll, initialTimer: currentPoll.timer, isSubmitted: isSubmitted || false });
      sentPolls.add(`${socket.id}-${currentPoll.timer}`);
      console.log(`Sent current poll to ${role} ${socket.id} with timer ${currentPoll.timer}, isSubmitted: ${isSubmitted || false}`);
    }
    socket.emit('pollHistory', pollHistory);
  });

  socket.emit('welcome', 'Connected to the polling server!');
  socket.emit('pollHistory', pollHistory);

  socket.on('createPoll', (pollData) => {
    console.log('Create poll attempt - currentPoll:', currentPoll);
    const activeStudents = Array.from(participants.values()).filter(p => p.role === 'student').map(p => p.id);
    const allAnswered = activeStudents.every(studentId => pollResponses[studentId] !== undefined);
    console.log('Active students:', activeStudents, 'Responses:', Object.keys(pollResponses), 'allAnswered:', allAnswered);
    if (!currentPoll || allAnswered) {
      const newPoll = { ...pollData, responses: {}, results: [], ended: false, initialTimer: pollData.timer, createdAt: new Date().toISOString() };
      pollHistory.push(newPoll);
      currentPoll = newPoll;
      pollResponses = {};
      submittedStudents.clear(); // Reset submitted status for new poll
      sentPolls.clear();
      io.emit('newPoll', { ...currentPoll, initialTimer: currentPoll.timer, isSubmitted: false });
      io.emit('pollHistory', pollHistory);
      console.log('New poll created and broadcasted with initial timer:', currentPoll.timer);
    } else {
      socket.emit('pollCreationDenied', 'Cannot create a new poll until all students have answered the current poll.');
      console.log('Poll creation denied - allAnswered:', allAnswered, 'currentPoll:', currentPoll);
    }
  });

  socket.on('submitAnswer', ({ studentId, answer, socketId }) => {
    console.log('Submit answer - studentId:', studentId, 'socketId:', socketId, 'currentPoll:', currentPoll);
    if (currentPoll && !currentPoll.ended && !pollResponses[socketId]) {
      pollResponses[socketId] = answer;
      const participant = Array.from(participants.entries()).find(([_, p]) => p.id === socketId);
      if (participant) {
        submittedStudents.set(participant[1].name, true); // Mark student as submitted
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
    console.log('Received endPoll request - currentPoll before:', currentPoll);
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
        const endedPoll = { ...currentPoll };
        currentPoll = null;
        pollResponses = {};
        submittedStudents.clear();
        sentPolls.clear();
        console.log('Poll ended, state cleared - endedPoll:', endedPoll, 'allAnswered:', allAnswered);
      } else {
        console.log('Poll ended but not all answered - keeping currentPoll:', currentPoll);
      }
    } else {
      console.log('endPoll received but no active poll found');
    }
  });

  socket.on('sendMessage', (message) => {
    console.log('Message received:', message);
    io.emit('newMessage', { ...message, timestamp: new Date().toISOString(), id: socket.id });
  });

  socket.on('kickParticipant', (participantId) => {
    console.log('Kicking participant:', participantId);
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
    console.log('User disconnected:', socket.id);
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
  console.log(`Server running on port ${PORT}`);
});