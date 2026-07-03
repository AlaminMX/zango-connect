import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/authContext";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Clock, Home } from "lucide-react";

export const Route = createFileRoute("/vendor-approval-pending")({
  component: VendorApprovalPendingPage,
});

function VendorApprovalPendingPage() {
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
        <Clock className="h-16 w-16 text-primary mb-4" />
        <h1 className="font-serif text-3xl mb-2">Approval In Progress</h1>
        <p className="text-muted-foreground mb-6">
          Thank you for registering your store. Our team is reviewing your application. We'll notify you once your store is approved.
        </p>
        <div className="space-y-2 w-full">
          <Link to="/">
            <Button variant="outline" className="w-full rounded-full">
              <Home className="h-4 w-4 mr-2" /> Back to home
            </Button>
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
