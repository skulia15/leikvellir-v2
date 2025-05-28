"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Settings, User, RefreshCw } from "lucide-react";

export function DevAuthToggle() {
  const [isRestarting, setIsRestarting] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const isMockAuth = process.env.ENABLE_MOCK_AUTH === "true";

  const handleToggle = async () => {
    setIsRestarting(true);

    // This would require server restart in real implementation
    // For now, just show instructions
    alert(
      `To ${isMockAuth ? "disable" : "enable"} mock authentication:\n\n` +
        `1. Add ENABLE_MOCK_AUTH=${isMockAuth ? "false" : "true"} to your .env file\n` +
        `2. Restart your development server\n\n` +
        `Current mode: ${isMockAuth ? "Mock Authentication" : "Real Authentication"}`,
    );

    setIsRestarting(false);
  };

  return (
    <Card className="border-dashed border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm text-orange-900">
            Development Mode
          </CardTitle>
          <Badge
            variant={isMockAuth ? "default" : "secondary"}
            className="text-xs"
          >
            {isMockAuth ? "Mock Auth" : "Real Auth"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-orange-700">
          Authentication mode for development testing
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <User className="h-3 w-3 text-orange-600" />
          <span className="text-xs text-orange-800">
            {isMockAuth
              ? "Using mock users - no OAuth required"
              : "Using Discord OAuth - requires setup"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={isRestarting}
          className="mt-3 h-7 border-orange-200 text-xs text-orange-700 hover:bg-orange-100"
        >
          {isRestarting ? (
            <>
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Switching...
            </>
          ) : (
            <>Switch to {isMockAuth ? "Real" : "Mock"} Auth</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
