import { useEffect } from "react";
import { Login } from "./routes/Login";
import { Home } from "./routes/Home";
import { Spinner } from "./components/common/Spinner";
import { useAuthStore } from "./store";
import styles from "./App.module.css";

function App() {
  const { currentUser, checkingAuth, fetchSession } = useAuthStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (checkingAuth) {
    return (
      <div className={styles.authLoadingScreen}>
        <Spinner size={36} />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={() => fetchSession()} />;
  }

  return <Home />;
}

export default App;