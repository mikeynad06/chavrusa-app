import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Landing from './pages/Landing.tsx';
import Dashboard from './pages/Dashboard.tsx';
import PostRequest from './pages/PostRequest.tsx';
import MainLayout from './components/MainLayout.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests/new" element={<PostRequest />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
