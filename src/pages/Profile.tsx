import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, User, LogOut, Clock, Code, FileImage } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { user, history, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("history");

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
      case "dwt":
        return "Discrete Wavelet Transform (DWT)";
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
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className={`p-2 rounded-full ${entry.operation === 'encode' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                        {entry.operation === 'encode' ? (
                          <Code className="w-5 h-5 text-primary" />
                        ) : (
                          <FileImage className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {entry.operation === 'encode' ? 'Encoded' : 'Decoded'} an image
                            </h4>
                            <Badge variant={entry.operation === 'encode' ? 'default' : 'secondary'}>
                              {entry.operation}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Algorithm: {getAlgorithmName(entry.algorithm)}
                        </p>
                        <p className="text-xs font-mono mt-1 truncate">
                          Hash: {entry.imageHash.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No activity history yet</p>
                  <p className="text-sm">Your encoding and decoding activities will appear here</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="encode" className="mt-4">
              {history.filter(entry => entry.operation === 'encode').length > 0 ? (
                <div className="space-y-4">
                  {history
                    .filter(entry => entry.operation === 'encode')
                    .map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Code className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Encoded an image</h4>
                              <Badge>encode</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Algorithm: {getAlgorithmName(entry.algorithm)}
                          </p>
                          <p className="text-xs font-mono mt-1 truncate">
                            Hash: {entry.imageHash.substring(0, 20)}...
                          </p>
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
              {history.filter(entry => entry.operation === 'decode').length > 0 ? (
                <div className="space-y-4">
                  {history
                    .filter(entry => entry.operation === 'decode')
                    .map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                        <div className="p-2 rounded-full bg-accent/10">
                          <FileImage className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Decoded an image</h4>
                              <Badge variant="secondary">decode</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Algorithm: {getAlgorithmName(entry.algorithm)}
                          </p>
                          <p className="text-xs font-mono mt-1 truncate">
                            Hash: {entry.imageHash.substring(0, 20)}...
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileImage className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No decoding history yet</p>
                  <p className="text-sm">Your decoding activities will appear here</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}