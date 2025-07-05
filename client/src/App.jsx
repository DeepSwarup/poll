import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Welcome from './components/Welcome';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import PollScreen from './components/PollScreen';
import PollHistory from './components/PollHistory';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/poll-history" element={<PollHistory />} />
        <Route path="/student/poll" element={<PollScreen />} />
      </Routes>
    </Router>
  );
}

export default App;