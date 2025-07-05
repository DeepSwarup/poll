import { io } from 'socket.io-client';

// const socket = io('http://localhost:3000');
const socket = io('https://poll-7z60.onrender.com/');

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('welcome', (message) => {
  console.log('Server message:', message);
});

export default socket;