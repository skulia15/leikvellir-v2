"use client";

import { Badge } from "~/components/ui/badge";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { useT } from "~/lib/i18n";

interface SubmissionStatusBadgeProps {
    status: "pending" | "approved" | "rejected";
}

export default function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
    const t = useT();

    if (status === "pending") {
        return (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="mr-1 h-3 w-3" />
                {t('mySubmissions.status.pending')}
            </Badge>
        );
    }

    if (status === "approved") {
        return (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('mySubmissions.status.approved')}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            {t('mySubmissions.status.rejected')}
        </Badge>
    );
}
