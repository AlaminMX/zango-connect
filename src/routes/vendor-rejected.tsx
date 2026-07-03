import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/authContext";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/vendor-rejected")({
  component: VendorRejectedPage,
});

function VendorRejectedPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-md px-5 py-12 flex flex-col items-center text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="font-serif text-3xl mb-2">Application Not Approved</h1>
        <p className="text-muted-foreground mb-6">
          Your store application was not approved at this time. Please contact our support team for more information.
        </p>
        <div className="space-y-2 w-full">
          <Link to="/">
            <Button variant="outline" className="w-full rounded-full">
              <Home className="h-4 w-4 mr-2" /> Back to home
            </Button>
          </Link>
          <a href="https://wa.me/234..." target="_blank" rel="noopener noreferrer">
            <Button variant="default" className="w-full rounded-full">
              <MessageCircle className="h-4 w-4 mr-2" /> Contact support
            </Button>
          </a>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
