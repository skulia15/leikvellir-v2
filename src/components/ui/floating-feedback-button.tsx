"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useT } from "~/lib/i18n";

export function FloatingFeedbackButton() {
  const t = useT();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild className="hidden sm:flex">
          <Button
            asChild
            size="sm"
            className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Link href="/contact">
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only">{t('contact.floatingButtonTooltip')}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{t('contact.floatingButtonTooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
