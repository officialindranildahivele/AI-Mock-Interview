import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateInterview from "./pages/CreateInterview";
import Interview from "./pages/Interview";
import History from "./pages/History";
import Results from "./pages/Results";
import InterviewDetails from "./pages/InterviewDetails";
import ResumeInterview from "./pages/ResumeInterview";
import VoiceInterview from "./pages/VoiceInterview";
import CameraInterview from "./pages/CameraInterview";
import ATSScanner from "./pages/ATSScanner";
import CodingInterview from "./pages/CodingInterview";
import CompanyInterviews from "./pages/CompanyInterviews";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        "{}"
    );
  } catch {
    return {};
  }
};

function ProtectedRoute({ children }) {
  const token =
    localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const token =
    localStorage.getItem("token");
  const user =
    getStoredUser();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (user?.isAdmin !== true) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interview/:id"
          element={
            <ProtectedRoute>
              <Interview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interview-details/:id"
          element={
            <ProtectedRoute>
              <InterviewDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:id"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumeInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/voice"
          element={
            <ProtectedRoute>
              <VoiceInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/camera"
          element={
            <ProtectedRoute>
              <CameraInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ats"
          element={
            <ProtectedRoute>
              <ATSScanner />
            </ProtectedRoute>
          }
        />

        <Route
          path="/coding"
          element={
            <ProtectedRoute>
              <CodingInterview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <CompanyInterviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
