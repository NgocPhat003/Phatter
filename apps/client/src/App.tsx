import { useEffect, useState, useCallback } from "react";
import { api } from "./lib/api";
import { Login } from "./routes/Login";
import { Home } from "./routes/Home";
import type { CurrentUser } from "./features/posts/types/types";

function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setCurrentUser(res.data.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setCurrentUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7f9fa",
          color: "#9ca3af",
          fontFamily: "sans-serif",
        }}
      >
        Connecting...
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={() => fetchSession()} />;
  }

  return (
    <Home
      currentUser={currentUser}
      onLogout={handleLogout}
      onProfileUpdated={() => fetchSession()}
    />
  );
}

export default App;