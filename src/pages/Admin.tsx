import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('demo_user') || '{}');

  if (!user.username || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-files');
      
      if (error) throw error;
      
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast.error('Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('demo_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Logged in as: {user.username}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} variant="outline" disabled={isLoading} className="border-border">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-border">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Card className="border-accent/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <CardHeader>
            <CardTitle className="text-foreground">Upload Logs</CardTitle>
            <CardDescription className="text-muted-foreground">
              All file scan results and encrypted file storage
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No upload logs yet
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary">
                      <TableHead className="text-foreground">User</TableHead>
                      <TableHead className="text-foreground">Filename</TableHead>
                      <TableHead className="text-foreground">Size</TableHead>
                      <TableHead className="text-foreground">SHA-256</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-secondary/50">
                        <TableCell className="font-mono text-sm text-foreground">{log.username}</TableCell>
                        <TableCell className="text-foreground">{log.filename}</TableCell>
                        <TableCell className="text-muted-foreground">{(log.file_size / 1024).toFixed(2)} KB</TableCell>
                        <TableCell className="font-mono text-xs text-primary truncate max-w-xs">
                          {log.sha256}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.status === 'clean' ? 'default' : 'destructive'}
                            className={log.status === 'clean' ? 'bg-success text-success-foreground' : ''}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;