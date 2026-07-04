'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package, User, Settings, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirectTo=/account');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const menuItems = [
    { href: '/account/orders', label: 'My Orders', icon: Package, description: 'View and track your orders' },
    { href: '/account/profile', label: 'Profile', icon: User, description: 'Manage your account details' },
    { href: '/account/settings', label: 'Settings', icon: Settings, description: 'Notifications and preferences' },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">My Account</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {profile?.full_name || 'Customer'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t">
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
