"use client";

import { Check, Globe } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "~/lib/i18n";
import { locales, getLocaleConfig } from "~/lib/i18n/config";
import { type Locale } from "~/lib/i18n/types";

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "lg" | "default" | "icon" | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export default function LanguageSwitcher({
  variant = "ghost",
  size = "sm",
  showLabel = false,
  className = ""
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();
  const currentLocaleConfig = getLocaleConfig(locale);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center space-x-2 ${className}`}
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLocaleConfig.flag}</span>
          {showLabel && (
            <span className="hidden sm:inline">{currentLocaleConfig.nativeName}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((localeConfig) => (
          <DropdownMenuItem
            key={localeConfig.code}
            onClick={() => handleLocaleChange(localeConfig.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{localeConfig.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{localeConfig.nativeName}</span>
                <span className="text-xs text-muted-foreground">{localeConfig.name}</span>
              </div>
            </div>
            {locale === localeConfig.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
