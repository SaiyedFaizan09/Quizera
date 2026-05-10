import { useState } from "react";
import Header from "../components/Header";
import Navbar from "../components/Navbar";

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.content}>
        <Navbar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          toggleSidebar={() => setIsSidebarOpen((s) => !s)}
        />
        <main style={{
          ...styles.main,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg-light)",
  },
  content: {
    display: "flex",
    position: "relative",
  },
  main: {
    flex: 1,
    padding: "24px",
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    transition: "all 0.3s ease",
  },
};

export default DashboardLayout;
