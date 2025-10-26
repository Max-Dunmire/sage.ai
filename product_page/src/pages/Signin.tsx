import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Signin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.email.includes("@")) {
      toast.error("Invalid email", {
        description: "Please enter a valid email address",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      toast.error("Password required", {
        description: "Please enter your password",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error("Sign in failed", {
          description: errorData.message || "Invalid email or password. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Store user in AuthContext
      if (data.user) {
        login(data.user);
      }

      toast.success("Welcome back!", {
        description: "Redirecting to your settings...",
      });

      // Redirect to settings page after successful signin
      setTimeout(() => {
        navigate("/settings");
      }, 2000);
    } catch (error) {
      toast.error("Sign in failed", {
        description: error instanceof Error ? error.message : "Invalid email or password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-20 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">Sign in to Sage.ai</h1>
            <p className="text-muted-foreground">
              Access your account and manage your settings
            </p>
          </div>

          {/* Signin Form Card */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-sage hover:opacity-90 text-base font-medium py-6"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <a href="/signup" className="text-primary font-medium hover:underline">
                    Sign up
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>🔒 Your login is secure and encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signin;
