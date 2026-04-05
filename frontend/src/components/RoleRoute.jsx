import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allowedRoles, children }) {
  const { role } = useAuth();

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
