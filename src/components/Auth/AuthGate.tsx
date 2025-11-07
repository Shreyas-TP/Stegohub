import { ReactNode, useEffect, useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getUser();
      setIsAuthenticated(!!user);
    } catch {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-card">
          <Tabs value={showRegister ? 'register' : 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" onClick={() => setShowRegister(false)}>
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" onClick={() => setShowRegister(true)}>
                Sign Up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <div className="p-6">
                <LoginForm onToggleForm={() => setShowRegister(true)} />
              </div>
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <div className="p-6">
                <RegisterForm onToggleForm={() => setShowRegister(false)} />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

