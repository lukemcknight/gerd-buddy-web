import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const from = (location.state as { from?: string })?.from || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError("");
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      setError("Failed to send reset email. Check your email address.");
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back to GERD Buddy
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-success">
              Password reset email sent! Check your inbox.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
