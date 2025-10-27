import { useState } from "react";
import { LoginForm } from "@/components/Auth/LoginForm";
import { RegisterForm } from "@/components/Auth/RegisterForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { currentUser } = useAuth();

  // Redirect if user is already logged in
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleForm={toggleForm} />
        ) : (
          <RegisterForm onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
}