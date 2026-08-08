import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TodosPage from './pages/TodosPage';
import StatsPage from './pages/StatsPage';
import KanbanPage from './pages/KanbanPage';
import CalendarPage from './pages/CalendarPage';
import AnimatedPage from './components/AnimatedPage';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <AnimatedPage>
                <TodosPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/stats"
            element={
              <AnimatedPage>
                <StatsPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/kanban"
            element={
              <AnimatedPage>
                <KanbanPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/calendar"
            element={
              <AnimatedPage>
                <CalendarPage />
              </AnimatedPage>
            }
          />
        </Route>
        <Route
          path="/login"
          element={
            <AnimatedPage>
              <LoginPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/register"
          element={
            <AnimatedPage>
              <RegisterPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AnimatedPage>
              <ForgotPasswordPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AnimatedPage>
              <ResetPasswordPage />
            </AnimatedPage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
