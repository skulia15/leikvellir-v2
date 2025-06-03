"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useMunicipalities } from "~/lib/api/use-municipalities";
import { useTranslation } from "~/lib/i18n";

interface MunicipalitySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function MunicipalitySelector({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: MunicipalitySelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { municipalities, loading, error } = useMunicipalities();

  const selectedMunicipality = municipalities.find(m => m.nafn === value);

  return (
    <Popover open={open && !error && !loading} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          {loading ? (
            t("common.loading")
          ) : error ? (
            "Error loading municipalities"
          ) : selectedMunicipality ? (
            selectedMunicipality.nafn
          ) : (
            placeholder || t("playground.selectMunicipality")
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("playground.searchMunicipality")} />
          <CommandList>
            <CommandEmpty>
              {t("playground.noMunicipalityFound")}
            </CommandEmpty>
            <CommandGroup>
              {municipalities.map((municipality) => (
                <CommandItem
                  key={municipality.svfn}
                  value={municipality.nafn}
                  onSelect={() => {
                    onValueChange(municipality.nafn);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === municipality.nafn ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{municipality.nafn}</span>
                    {municipality.nafn !== municipality.fulltnafn && (
                      <span className="text-xs text-muted-foreground">
                        {municipality.fulltnafn}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
