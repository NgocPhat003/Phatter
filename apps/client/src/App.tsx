import { useEffect, useState, useCallback } from "react";
import { api } from "./lib/api";
import { Login } from "./routes/Login";
import { Home } from "./routes/Home";
import { Spinner } from "./components/common/Spinner";
import { disconnectSocket } from "./lib/socket";
import { resetOnlineUsersTracker } from "./hooks/useOnlineUsers";
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
      disconnectSocket();
      resetOnlineUsersTracker();
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
        }}
      >
        <Spinner size={36} />
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