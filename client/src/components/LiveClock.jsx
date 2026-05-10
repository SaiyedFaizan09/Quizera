import { useEffect, useState } from "react";

const LiveClock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div style={styles.wrap}>
      <span style={styles.date}>{dateStr}</span>
      <span style={styles.time}>{timeStr}</span>
    </div>
  );
};

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  date: {
    color: "var(--text-light)",
    fontSize: "12px",
    fontWeight: "500",
  },
  time: {
    color: "var(--text-dark)",
    fontSize: "14px",
    fontWeight: "600",
    fontVariantNumeric: "tabular-nums",
  },
};

export default LiveClock;
