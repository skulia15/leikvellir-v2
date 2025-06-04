"use client";

import { Mail, Github, MessageSquare, Bug, Lightbulb, HelpCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ContactForm } from "./contact-form";
import { useT } from "~/lib/i18n";

export function ContactPageClient() {
  const t = useT();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">{t('contact.contactAndFeedback')}</h1>
        <p className="text-muted-foreground">
          {t('contact.pageSubtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Methods */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('contact.sendMessage')}
              </CardTitle>
              <CardDescription>
                {t('contact.sendMessageDescription')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('contact.emailDirect')}
              </CardTitle>
              <CardDescription>
                {t('contact.emailDirectDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href="mailto:skuliarnarsson@gmail.com">
                  skuliarnarsson@gmail.com
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                {t('contact.githubIssues')}
              </CardTitle>
              <CardDescription>
                {t('contact.githubIssuesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" asChild className="w-full">
                  <a
                    href="https://github.com/skulia15/leikvellir-v2/issues/new?template=bug_report.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    {t('contact.reportBug')}
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a
                    href="https://github.com/skulia15/leikvellir-v2/issues/new?template=feature-request.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {t('contact.requestFeature')}
                  </a>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <a
                    href="https://github.com/skulia15/leikvellir-v2/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {t('contact.viewAllIssues')}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* 
          <Card>
            <CardHeader>
              <CardTitle>{t('contact.whatToInclude')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-red-600">{t('contact.bugReports')}</h4>
                  <p className="text-muted-foreground">
                    {t('contact.bugReportsDescription')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-600">{t('contact.featureIdeas')}</h4>
                  <p className="text-muted-foreground">
                    {t('contact.featureIdeasDescription')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-green-600">{t('contact.questions')}</h4>
                  <p className="text-muted-foreground">
                    {t('contact.questionsDescription')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Contact Form */}
        <div>
          <ContactForm />
        </div>
      </div>

      {/* Developer Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('contact.aboutDeveloper')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">
                {t('contact.developerDescription')}
              </p>
              <div className="text-right">
                <p className="font-medium">{t('contact.developerName')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('contact.developerTitle')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
