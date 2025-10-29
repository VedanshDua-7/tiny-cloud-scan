import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload as UploadIcon, AlertTriangle, CheckCircle, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const user = JSON.parse(localStorage.getItem('demo_user') || '{}');

  if (!user.username) {
    navigate('/');
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error('File too large (max 2MB)');
        return;
      }
      setFile(selectedFile);
      setScanResult(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('username', user.username);

      const { data, error } = await supabase.functions.invoke('scan-file', {
        body: formData
      });

      if (error) throw error;

      setScanResult(data);

      if (data.status === 'malicious') {
        toast.error('Malware detected! File blocked.');
      } else {
        toast.success('File is clean and encrypted!');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('demo_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Malware Scanner</h1>
              <p className="text-sm text-muted-foreground">Logged in as: {user.username}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-border">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card className="border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
          <CardHeader>
            <CardTitle className="text-foreground">Upload File for Scanning</CardTitle>
            <CardDescription className="text-muted-foreground">
              Maximum file size: 2MB • Supports text files
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept="text/*,.txt"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <UploadIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-foreground font-medium mb-2">
                  {file ? file.name : 'Click to select a file'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Text files only'}
                </p>
              </label>
            </div>

            {file && (
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isScanning ? 'Scanning...' : 'Scan File'}
              </Button>
            )}

            {scanResult && (
              <Card className={`border-2 ${
                scanResult.status === 'malicious' 
                  ? 'border-destructive bg-destructive/5' 
                  : 'border-success bg-success/5'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {scanResult.status === 'malicious' ? (
                      <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-success flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className={`font-bold text-lg ${
                        scanResult.status === 'malicious' ? 'text-destructive' : 'text-success'
                      }`}>
                        {scanResult.status === 'malicious' ? 'Malware Detected!' : 'File is Clean'}
                      </h3>
                      <div className="space-y-1 text-sm font-mono">
                        <p className="text-foreground">SHA-256: <span className="text-primary">{scanResult.sha256}</span></p>
                        {scanResult.status === 'malicious' && (
                          <p className="text-destructive-foreground">Reason: {scanResult.reason}</p>
                        )}
                        {scanResult.status === 'clean' && (
                          <>
                            <p className="text-success-foreground">Status: Encrypted and stored securely</p>
                            <p className="text-muted-foreground text-xs break-all">
                              Storage: {scanResult.storage_path}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-2">Test Files:</h4>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>• Create <span className="text-foreground">benign.txt</span> - Will pass scan</li>
                <li>• Create file with <span className="text-destructive">DEMO_TRIGGER</span> text - Will be blocked</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;