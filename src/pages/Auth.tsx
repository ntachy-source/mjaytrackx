import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Radar, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email for a confirmation link.",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background scanline flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Radar className="w-8 h-8 text-primary text-glow" />
            <span className="text-3xl font-bold text-foreground tracking-tight">
              TRACK<span className="text-primary">X</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono-data">
            SECURE GPS TRACKING SYSTEM
          </p>
        </div>

        <div className="bg-card border border-border border-glow rounded-lg p-6">
          <div className="flex mb-6 bg-muted rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-mono-data rounded-md transition-all ${
                isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-mono-data rounded-md transition-all ${
                !isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-mono-data text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "PROCESSING..." : isLogin ? "ACCESS SYSTEM" : "CREATE ACCOUNT"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
