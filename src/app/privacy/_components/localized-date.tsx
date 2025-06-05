"use client";

import { useTranslation } from "~/lib/i18n";

export function LocalizedDate() {
    const { locale } = useTranslation();

    const formatDateForLocale = (date: Date, locale: string): string => {
        switch (locale) {
            case 'is':
                // Icelandic date format: "5. júní 2025"
                const icelandicMonths = [
                    'janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní',
                    'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'
                ];
                const day = date.getDate();
                const month = icelandicMonths[date.getMonth()];
                const year = date.getFullYear();
                return `${day}. ${month} ${year}`;

            case 'pl':
                // Polish date format using proper locale
                return date.toLocaleDateString('pl-PL', {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });

            case 'en':
            default:
                // English date format
                return date.toLocaleDateString('en-US', {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
        }
    };

    const formattedDate = formatDateForLocale(new Date(), locale);

    return <span>{formattedDate}</span>;
} 