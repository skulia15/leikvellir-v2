"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CheckCircle2, Loader2, Bug, Lightbulb, HelpCircle, FileText } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import { useT } from "~/lib/i18n";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  category: z.enum(["bug", "feature", "question", "other"], {
    required_error: "Please select a category",
  }),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  url: z.string().optional(),
  browser: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const t = useT();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      category: undefined,
      subject: "",
      message: "",
      url: "",
      browser: "",
    },
  });

  const watchedCategory = form.watch("category");

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      // Create email content
      const emailSubject = `[Leiksvæði] ${getCategoryLabel(data.category)} - ${data.subject}`;
      const emailBody = `
Name: ${data.name}
Email: ${data.email}
Category: ${getCategoryLabel(data.category)}
${data.url ? `URL: ${data.url}` : ''}
${data.browser ? `Browser: ${data.browser}` : ''}

Message:
${data.message}

---
Sent from Leiksvæði contact form
      `.trim();

      // Create mailto link
      const mailtoLink = `mailto:skuliarnarsson@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // Open email client
      window.location.href = mailtoLink;

      // Mark as submitted after a short delay
      setTimeout(() => {
        setIsSubmitted(true);
        toast.success("Email client opened! Please send the email to complete your message.");
      }, 1000);

    } catch (error) {
      console.error("Error creating email:", error);
      toast.error("Error creating email. Please try again or contact skuliarnarsson@gmail.com directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "bug":
        return t('contact.bugReport').replace('🐛 ', '');
      case "feature":
        return t('contact.featureRequest').replace('💡 ', '');
      case "question":
        return t('contact.question').replace('❓ ', '');
      case "other":
        return t('contact.other').replace('📝 ', '');
      default:
        return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "bug":
        return Bug;
      case "feature":
        return Lightbulb;
      case "question":
        return HelpCircle;
      case "other":
        return FileText;
      default:
        return FileText;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case "bug":
        return t('contact.bugCategoryDescription');
      case "feature":
        return t('contact.featureCategoryDescription');
      case "question":
        return t('contact.questionCategoryDescription');
      case "other":
        return t('contact.otherCategoryDescription');
      default:
        return "";
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h3 className="mb-2 text-lg font-medium">{t('contact.emailReady')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('contact.emailReadyDescription')}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubmitted(false);
                form.reset();
              }}
            >
              {t('contact.sendAnotherMessage')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('contact.formTitle')}</CardTitle>
        <CardDescription>
          {t('contact.formDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact.name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('contact.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contact.email')} *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('contact.emailPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contact.category')} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('contact.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bug" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Bug className="h-4 w-4" />
                          {getCategoryLabel('bug')}
                        </div>
                      </SelectItem>
                      <SelectItem value="feature" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          {getCategoryLabel('feature')}
                        </div>
                      </SelectItem>
                      <SelectItem value="question" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          {getCategoryLabel('question')}
                        </div>
                      </SelectItem>
                      <SelectItem value="other" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {getCategoryLabel('other')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {watchedCategory && (
                    <FormDescription>
                      <div className="flex items-start gap-2 mt-2">
                        {(() => {
                          const IconComponent = getCategoryIcon(watchedCategory);
                          return <IconComponent className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />;
                        })()}
                        <span>{getCategoryDescription(watchedCategory)}</span>
                      </div>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contact.subject')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('contact.subjectPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchedCategory === "bug" || watchedCategory === "question") && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchedCategory === "bug" ? t('contact.pageUrl') : t('contact.relatedPageUrl')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('contact.pageUrlPlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('contact.pageUrlDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="browser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contact.browserDevice')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('contact.browserDevicePlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('contact.browserDeviceDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contact.message')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        watchedCategory === "bug"
                          ? t('contact.bugMessagePlaceholder')
                          : watchedCategory === "feature"
                            ? t('contact.featureMessagePlaceholder')
                            : t('contact.generalMessagePlaceholder')
                      }
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('contact.preparingEmail')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('contact.sendMessage')}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
