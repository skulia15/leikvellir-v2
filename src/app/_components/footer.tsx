// app/_components/footer.tsx
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

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* <Playground className="h-6 w-6 text-primary" /> */}
              <h3 className="text-lg font-bold">Leikvellir</h3>
              <Badge variant="outline" className="text-xs">
                Beta
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Discover and map playgrounds across Iceland. A community-driven platform
              to help families find the perfect play spaces for their children.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>Hafnarfjörður, Iceland</span>
              </div>
              {/* <div className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Made with love</span>
              </div> */}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Explore Map
                </Link>
              </li>
              <li>
                <Link
                  href="/create-playground"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Add Playground
                </Link>
              </li>
              <li>
                <Link
                  href="/playgrounds"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse Playgrounds
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  Cookie Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer & Contact */}
          <div>
            <h4 className="font-semibold mb-4">Developer</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Skúli Arnarsson</p>
                <p className="text-muted-foreground">Software Developer</p>
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
                  href="mailto:skuliarnarson@gmail.com"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>skuliarnarson@gmail.com</span>
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
              <span>{currentYear} Skúli Arnarsson. All rights reserved.</span>
            </div>

            {/* <div className="text-xs text-muted-foreground">
              <span>Leikvellir™ is a trademark of Skúli Arnarsson</span>
            </div> */}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Code className="h-3 w-3" />
              <span>Built with Next.js & TypeScript</span>
            </div>

            <span>•</span>

            <span>v1.0.0-beta</span>
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
