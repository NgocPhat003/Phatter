import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { Login } from "./routes/Login";
import { Home } from "./routes/Home";

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        setCurrentUser(res.data.user.username);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

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
    return <Login onLoginSuccess={(username) => setCurrentUser(username)} />;
  }

  return <Home currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;