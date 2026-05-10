import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AttemptDashboard from "./pages/AttemptDashboard";
import CreateDashboard from "./pages/CreateDashboard";
import CreateQuiz from "./pages/CreateQuiz";
import AttemptQuizInfo from "./pages/AttemptQuizInfo";
import AttemptQuizForm from "./pages/AttemptQuizForm";
import AttemptResult from "./pages/AttemptResult";
import QuizVault from "./pages/QuizVault";
import ManageQuiz from "./pages/ManageQuiz";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attempt"
            element={
              <ProtectedRoute>
                <AttemptDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/create"
            element={
              <ProtectedRoute>
                <CreateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-quiz"
            element={
              <ProtectedRoute>
                <CreateQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attempt-quiz/info"
            element={
              <ProtectedRoute>
                <AttemptQuizInfo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attempt-quiz/:id"
            element={
              <ProtectedRoute>
                <AttemptQuizForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attempt-result/:id"
            element={
              <ProtectedRoute>
                <AttemptResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz-vault"
            element={
              <ProtectedRoute>
                <QuizVault />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz-vault/creator"
            element={
              <ProtectedRoute>
                <QuizVault />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-quiz/:id"
            element={
              <ProtectedRoute>
                <ManageQuiz />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
