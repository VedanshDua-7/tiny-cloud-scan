import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username, password }
      });

      if (error) throw error;

      if (data.success) {
        localStorage.setItem('demo_user', JSON.stringify(data.user));
        toast.success(`Welcome, ${data.user.username}!`);
        
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/upload');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <Card className="w-full max-w-md relative z-10 border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Cloud Malware Detection</CardTitle>
          <CardDescription className="text-muted-foreground">
            Demo System - Secure File Analysis
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <Input
                type="text"
                placeholder="demo_user or demo_admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? 'Authenticating...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-mono mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground">User: <span className="text-primary">demo_user</span> / <span className="text-primary">password123</span></p>
              <p className="text-foreground">Admin: <span className="text-accent">demo_admin</span> / <span className="text-accent">admin123</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;