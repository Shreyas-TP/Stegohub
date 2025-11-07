import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, User, LogOut, Clock, Code, FileImage, Eye, Key } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchHistory } from "@/lib/history";
import type { StegoHistoryRow } from "@/lib/types";
import { FileFormat } from "@/utils/steganography";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("history");
  const [dbHistory, setDbHistory] = useState<StegoHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);
  
  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const history = await fetchHistory();
      setDbHistory(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDecode = async (entry: StegoHistoryRow) => {
    if (!entry.stego_file?.storage_key) {
      alert('Storage key not found');
      return;
    }
    
    try {
      // Navigate to home page with decode tab active
      navigate('/');
      // Wait a bit for navigation, then trigger decode
      setTimeout(async () => {
        if ((window as any).decodeFromHistory) {
          await (window as any).decodeFromHistory(
            entry.stego_file.storage_key,
            entry.algorithm,
            entry.encrypted,
            entry.metadata?.fileFormat || FileFormat.IMAGE
          );
        }
      }, 500);
    } catch (error) {
      console.error('Failed to decode:', error);
      alert('Failed to load file for decoding');
    }
  };

  // Redirect if not logged in
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  // Get algorithm display name
  const getAlgorithmName = (algorithm: string) => {
    switch (algorithm) {
      case "lsb":
        return "Least Significant Bit (LSB)";
      case "dct":
        return "Discrete Cosine Transform (DCT)";
      case "audio_phase":
        return "Audio Phase Coding";
      case "audio_echo":
        return "Audio Echo Hiding";
      default:
        return algorithm.toUpperCase();
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* User Profile Card */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
            <AvatarFallback>{user ? getInitials(user.username) : "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl">{user?.username}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardHeader>
      </Card>

      {/* History Tabs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Activity History
          </CardTitle>
          <CardDescription>Your steganography encoding and decoding history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="encode">Encoding</TabsTrigger>
              <TabsTrigger value="decode">Decoding</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading history...</p>
                </div>
              ) : dbHistory.length > 0 ? (
                <div className="space-y-4">
                  {dbHistory.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Code className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              Encoded file: {entry.stego_file?.filename || 'Unknown'}
                            </h4>
                            {entry.encrypted && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                Encrypted
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Algorithm: {getAlgorithmName(entry.algorithm)}
                        </p>
                        {entry.stego_file?.sha256 && (
                          <p className="text-xs font-mono mt-1 truncate">
                            Hash: {entry.stego_file.sha256.substring(0, 20)}...
                          </p>
                        )}
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecode(entry)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Decode
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No activity history yet</p>
                  <p className="text-sm">Your encoding activities will appear here</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="encode" className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading history...</p>
                </div>
              ) : dbHistory.length > 0 ? (
                <div className="space-y-4">
                  {dbHistory.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Code className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {entry.stego_file?.filename || 'Encoded file'}
                            </h4>
                            {entry.encrypted && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                Encrypted
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Algorithm: {getAlgorithmName(entry.algorithm)}
                        </p>
                        {entry.stego_file?.sha256 && (
                          <p className="text-xs font-mono mt-1 truncate">
                            Hash: {entry.stego_file.sha256.substring(0, 20)}...
                          </p>
                        )}
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecode(entry)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Decode
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No encoding history yet</p>
                  <p className="text-sm">Your encoding activities will appear here</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="decode" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <FileImage className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Decoding history</p>
                <p className="text-sm">Use the Decode button on encoded files to decode them</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}