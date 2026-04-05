import { Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./services/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DonorDashboard from "./pages/DonorDashboard";
import DonorHistoryPage from "./pages/DonorHistoryPage";
import NGODashboard from "./pages/NGODashboard";
import TrackingPage from "./pages/TrackingPage";


function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <Link to={user ? (user.role === "donor" ? "/donor" : "/ngo") : "/"} className="brand">
        <span className="brand-mark">K</span>
        <span>Kindora</span>
      </Link>
      <div className="nav-actions">
        <Link to="/">Home</Link>
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/register">Register</Link>}
        {user?.role === "donor" && <Link to="/donor">Dashboard</Link>}
        {user?.role === "donor" && <Link to="/donor/history">History</Link>}
        {user?.role === "ngo" && <Link to="/ngo">Dashboard</Link>}
        {user && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

function Private({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <HomePage />;
  return <Navigate to={user.role === "ngo" ? "/ngo" : "/donor"} replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === "ngo" ? "/ngo" : "/donor"} replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <RegisterPage />
              </PublicOnly>
            }
          />
          <Route
            path="/donor"
            element={
              <Private roles={["donor"]}>
                <DonorDashboard />
              </Private>
            }
          />
          <Route
            path="/donor/history"
            element={
              <Private roles={["donor"]}>
                <DonorHistoryPage />
              </Private>
            }
          />
          <Route
            path="/ngo"
            element={
              <Private roles={["ngo"]}>
                <NGODashboard />
              </Private>
            }
          />
          <Route
            path="/track/:id"
            element={
              <Private roles={["donor", "ngo"]}>
                <TrackingPage />
              </Private>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
