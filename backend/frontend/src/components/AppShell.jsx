import {
  NavLink,
  useNavigate,
} from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    marker: "D",
  },
  {
    label: "Create",
    path: "/create",
    marker: "C",
  },
  {
    label: "History",
    path: "/history",
    marker: "H",
  },
  {
    label: "Resume",
    path: "/resume",
    marker: "R",
  },
  {
    label: "Voice",
    path: "/voice",
    marker: "V",
  },
  {
    label: "Camera",
    path: "/camera",
    marker: "M",
  },
  {
    label: "ATS",
    path: "/ats",
    marker: "A",
  },
  {
    label: "Coding",
    path: "/coding",
    marker: "K",
  },
  {
    label: "Companies",
    path: "/companies",
    marker: "C",
  },
  {
    label: "Leaderboard",
    path: "/leaderboard",
    marker: "L",
  },
  {
    label: "Admin",
    path: "/admin",
    marker: "AD",
    adminOnly: true,
  },
];

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        "{}"
    );
  } catch {
    return {};
  }
};

function AppShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}) {
  const navigate = useNavigate();
  const user =
    getStoredUser();
  const visibleNavItems =
    navItems.filter(
      (item) =>
        !item.adminOnly ||
        user?.isAdmin === true
    );

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("questions");
    localStorage.removeItem("interviewId");
    localStorage.removeItem("finalScore");

    navigate("/");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <span className="brand-mark">
            AI
          </span>
          <span>
            <strong>MockPro</strong>
            <small>Interview Studio</small>
          </span>
        </button>

        <nav className="nav-list">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              <span className="nav-marker">
                {item.marker}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="nav-link logout-link"
          type="button"
          onClick={logout}
        >
          <span className="nav-marker">
            Q
          </span>
          Logout
        </button>
      </aside>

      <main className="main-surface">
        <header className="page-header">
          <div>
            {eyebrow && (
              <p className="eyebrow">
                {eyebrow}
              </p>
            )}
            <h1>{title}</h1>
            {subtitle && (
              <p className="page-subtitle">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="page-actions">
              {actions}
            </div>
          )}
        </header>

        {children}
      </main>
    </div>
  );
}

export default AppShell;
