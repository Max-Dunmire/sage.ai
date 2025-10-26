import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
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
    if (!formData.fullName.trim()) {
      toast.error("Name required", {
        description: "Please enter your full name",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      toast.error("Invalid email", {
        description: "Please enter a valid email address",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Weak password", {
        description: "Password must be at least 8 characters",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure your passwords match",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error("Signup failed", {
          description: errorData.message || "Something went wrong. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Store user in AuthContext
      if (data.user) {
        login(data.user);
      }

      toast.success("Account created!", {
        description: "Welcome to Sage.ai! Redirecting to your settings...",
      });

      // Redirect to settings page after successful signup
      setTimeout(() => {
        navigate("/settings");
      }, 2000);
    } catch (error) {
      toast.error("Signup failed", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
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
            <h1 className="text-4xl font-bold mb-2">Create your account</h1>
            <p className="text-muted-foreground">
              Join Sage.ai and start your 14-day free trial
            </p>
          </div>

          {/* Signup Form Card */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

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
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  At least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
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
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>

              {/* Terms & Conditions */}
              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>

              {/* Sign In Link */}
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/signin" className="text-primary font-medium hover:underline">
                    Sign in
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>🔒 Your data is secure and encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
