import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  Server,
  Activity,
  CheckCircle2,
  RefreshCw,
  Info,
  Clock,
  Zap,
  Radio,
} from "lucide-react";
import styles from "./AtmosphericShield.module.css";

interface AtmosphericShieldProps {
  onServerReady: () => void;
}

export const AtmosphericShield: React.FC<AtmosphericShieldProps> = ({
  onServerReady,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isDisengaging, setIsDisengaging] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const hasTriggeredReady = useRef(false);

  // Compute status endpoint
  const serverBaseUrl = (
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
    "http://localhost:3000"
  ).replace(/\/api\/?$/, "");

  const statusUrl = `${serverBaseUrl}/api/status`;

  // Dynamic progress estimation based on typical 35s Render container cold start
  const progressPercent = isReady
    ? 100
    : Math.min(94, Math.max(8, Math.round(elapsedSeconds * 2.6)));

  // Dynamic status messaging tailored to cold start progression
  const getStatusMessage = () => {
    if (isReady) return "Gateway link established! Dropping Atmospheric Shield...";
    if (elapsedSeconds < 7) return "Sending atmospheric probe to cloud gateway...";
    if (elapsedSeconds < 18) return "Waking container from low-power sleep state (Render)...";
    if (elapsedSeconds < 32) return "Mounting PostgreSQL pool and Socket.io engine...";
    return "Finalizing handshake. Container is almost live...";
  };

  // Safe callback trigger with graceful exit animation
  const completeHandshake = useCallback(
    (instant: boolean) => {
      if (hasTriggeredReady.current) return;
      hasTriggeredReady.current = true;
      setIsReady(true);

      if (instant) {
        onServerReady();
      } else {
        // Allow user to see the success state, then play disengage animation
        setTimeout(() => {
          setIsDisengaging(true);
          setTimeout(() => {
            onServerReady();
          }, 500);
        }, 600);
      }
    },
    [onServerReady]
  );

  // Ping function
  const pingServer = useCallback(async (isInitial = false) => {
    if (hasTriggeredReady.current) return;
    setIsChecking(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const startPingTime = performance.now();

    try {
      const res = await fetch(statusUrl, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const pingDuration = performance.now() - startPingTime;
        // If the very first ping returned in under 450ms, the server is already hot/warm!
        const isWarmAlready = isInitial && pingDuration < 450;
        completeHandshake(isWarmAlready);
      }
    } catch {
      // Ignored: Server still spinning up
    } finally {
      clearTimeout(timeoutId);
      setIsChecking(false);
      setAttempts((prev) => prev + 1);
    }
  }, [statusUrl, completeHandshake]);

  // Elapsed timer ticker
  useEffect(() => {
    if (isReady) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isReady]);

  // Polling loop
  useEffect(() => {
    if (isReady) return;

    // Fire initial probe immediately
    pingServer(true);

    // Schedule subsequent probes every 3 seconds
    const interval = setInterval(() => {
      pingServer(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [pingServer, isReady]);

  // Card state classes
  const cardStateClass = isReady
    ? styles.ready
    : elapsedSeconds >= 10
    ? styles.amberState
    : "";

  return (
    <div
      className={`${styles.shieldOverlay} ${
        isDisengaging ? styles.disengaging : ""
      }`}
    >
      <div className={styles.gridPattern} />

      <div className={`${styles.shieldCard} ${cardStateClass}`}>
        {/* Pulsing Radar Beacon */}
        <div className={styles.beaconWrapper}>
          <div className={styles.radarRing1} />
          <div className={styles.radarRing2} />
          <div className={styles.beaconCore}>
            {isReady ? (
              <CheckCircle2 size={32} />
            ) : elapsedSeconds >= 10 ? (
              <Server size={30} />
            ) : (
              <Shield size={30} />
            )}
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className={styles.shieldBadge}>
          <span className={styles.pulseDot} />
          {isReady
            ? "Gateway Connected"
            : elapsedSeconds >= 10
            ? "Cold Start In Progress"
            : "Atmospheric Shield Active"}
        </div>

        <h1 className={styles.title}>Phatter Gateway Shield</h1>
        <p className={styles.subtitle}>
          {isReady
            ? "Cloud link verified. Initializing React Router and session context."
            : "Intercepting route initialization to protect against free cloud container sleep cycles."}
        </p>

        {/* Live Telemetry Box */}
        <div className={styles.telemetryBox}>
          <div className={styles.telemetryRow}>
            <span className={styles.telemetryLabel}>
              <Activity size={14} /> Connection Status
            </span>
            <span className={styles.telemetryValue}>
              {isReady ? "200 OK (Live)" : "Probing Backend..."}
            </span>
          </div>

          <div className={styles.telemetryRow}>
            <span className={styles.telemetryLabel}>
              <Radio size={14} /> Probe Attempts
            </span>
            <span className={styles.telemetryValue}>#{attempts}</span>
          </div>

          <div className={styles.telemetryRow}>
            <span className={styles.telemetryLabel}>
              <Clock size={14} /> Elapsed Wait
            </span>
            <span className={styles.telemetryValue}>{elapsedSeconds}s</span>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className={styles.statusMessage}>
            <Zap size={13} /> {getStatusMessage()}
          </div>
        </div>

        {/* Recruiter / Architecture Transparency Callout */}
        <div className={styles.recruiterNote}>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.25rem" }}>
            <Info size={14} color="#60a5fa" />
            <strong>Cloud Architecture Note</strong>
          </div>
          To operate with <strong>$0 cloud hosting overhead</strong>, the Render backend sleeps after 15 minutes of inactivity. This shield keeps the router dormant on frame zero, ensuring no broken 504s or uncaught connection errors reach your browser.
        </div>

        {/* Actions */}
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.pingButton}
            onClick={() => pingServer(false)}
            disabled={isChecking || isReady}
          >
            <RefreshCw
              size={14}
              className={isChecking ? styles.spinAnimation : undefined}
            />
            {isChecking ? "Pinging Gateway..." : "Force Ping Now"}
          </button>
        </div>
      </div>
    </div>
  );
};
