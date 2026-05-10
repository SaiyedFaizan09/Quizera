import LiveClock from "./LiveClock";
import logo from "../assets/logo.png";
import { useUser } from "../context/UserContext";

const Header = () => {
  const { userName } = useUser();

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <img src={logo} alt="Quizera" style={styles.logo} />
        <h1 style={styles.title}>Quizera</h1>
      </div>

      <div style={styles.right}>
        <span style={styles.user}>{userName}</span>
        <LiveClock />
      </div>
    </header>
  );
};

const styles = {
  header: {
    height: "64px",
    background: "var(--bg-white)",
    borderBottom: "1px solid var(--border-light)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    borderRadius: "8px",
  },
  title: {
    color: "var(--primary-blue)",
    fontSize: "22px",
    fontWeight: "600",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  user: {
    fontWeight: "500",
    color: "var(--text-dark)",
  },
};

export default Header;
