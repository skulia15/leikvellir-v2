// app/_components/footer.tsx
"use client";

import {
  Code,
  Copyright,
  ExternalLink,
  Github,
  Mail,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useT } from "~/lib/i18n";
import { useLayout } from "./layout-client";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useT();
  const { shouldShowFooter, hideFooterOnMobile } = useLayout();

  // Don't render footer if context says we shouldn't
  if (!shouldShowFooter) {
    return null;
  }

  return (
    <footer className={`border-t border-border bg-card ${hideFooterOnMobile ? "hidden md:block" : ""}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* <Playground className="h-6 w-6 text-primary" /> */}
              <h3 className="text-lg font-bold font-display">{t('footer.brand')}</h3>
              <Badge variant="outline" className="text-xs">
                {t('footer.beta')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{t('footer.location')}</span>
              </div>

            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.exploreMap')}
                </Link>
              </li>
              <li>
                <Link
                  href="/playgrounds"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.browsePlaygrounds')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  {t('footer.cookieSettings')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer & Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">{t('footer.developer')}</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Skúli Arnarsson</p>
                <p className="text-muted-foreground">{t('footer.softwareDeveloper')}</p>
              </div>

              <div className="space-y-2">
                <a
                  href="https://github.com/skulia15"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Github className="h-4 w-4" />
                  <span>github.com/skulia15</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                <a
                  href="mailto:skuliarnarsson@gmail.com"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>skuliarnarsson@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Bottom Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Copyright className="h-4 w-4" />
              <span>{t('footer.allRightsReserved', { year: currentYear })}</span>
            </div>

            {/* <div className="text-xs text-muted-foreground">
              <span>Leiksvæði is a trademark of Skúli Arnarsson</span>
            </div> */}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Code className="h-3 w-3" />
              <span>{t('footer.builtWith')}</span>
            </div>

            <span>•</span>

            <span>v1.0.1-beta</span>
          </div>
        </div>

        {/* Analytics Notice */}
        {/* <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            This site uses PostHog for analytics to improve user experience.
            <Link
              href="/privacy"
              className="text-blue-600 hover:underline ml-1"
            >
              Learn more about our data usage
            </Link>
          </p>
        </div> */}
      </div>
    </footer>
  );
}
