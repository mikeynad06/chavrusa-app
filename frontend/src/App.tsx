import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Landing from './pages/Landing.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PostRequest from './pages/PostRequest.tsx';
import Matches from './pages/Matches.tsx';
import Chat from './pages/Chat.tsx';
import About from './pages/About.tsx';
import Haskamas from './pages/Haskamas.tsx';
import Profile from './pages/Profile.tsx';
import MainLayout from './components/MainLayout.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/haskamas" element={<Haskamas />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests/new" element={<PostRequest />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:matchId" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
