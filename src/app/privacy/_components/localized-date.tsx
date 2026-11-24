"use client";

import { useTranslation } from "~/lib/i18n";

export const PRIVACY_POLICY_LAST_UPDATED = new Date(Date.UTC(2026, 10, 24));

const ICELANDIC_MONTHS = [
    "janúar",
    "febrúar",
    "mars",
    "apríl",
    "maí",
    "júní",
    "júlí",
    "ágúst",
    "september",
    "október",
    "nóvember",
    "desember",
] as const;

export function formatDateForLocale(date: Date, locale: string): string {
    switch (locale) {
        case "is": {
            // Icelandic date format: "24. nóvember 2026"
            const day = date.getUTCDate();
            const month = ICELANDIC_MONTHS[date.getUTCMonth()];
            const year = date.getUTCFullYear();
            return `${day}. ${month} ${year}`;
        }

        case "pl":
            return date.toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
            });

        case "en":
        default:
            return date.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
            });
    }
}

interface LocalizedDateProps {
    date?: Date;
}

export function LocalizedDate({
    date = PRIVACY_POLICY_LAST_UPDATED,
}: LocalizedDateProps) {
    const { locale } = useTranslation();
    const formattedDate = formatDateForLocale(date, locale);

    return <time dateTime={date.toISOString().slice(0, 10)}>{formattedDate}</time>;
}