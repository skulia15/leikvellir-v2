"use client";

import { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMunicipality = municipalities.find(m => m.nafn === value);

  // Focus the input when dropdown opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const handleSelect = (municipalityName: string) => {
    onValueChange(municipalityName);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between", className)}
        disabled={disabled || loading}
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[300px] rounded-md border bg-popover shadow-md">
          <Command>
            <CommandInput
              ref={inputRef}
              placeholder={t("playground.searchMunicipality")}
            />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>
                {t("playground.noMunicipalityFound")}
              </CommandEmpty>
              <CommandGroup>
                {municipalities.map((municipality) => (
                  <CommandItem
                    key={municipality.svfn}
                    value={municipality.nafn}
                    onSelect={() => handleSelect(municipality.nafn)}
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
        </div>
      )}
    </div>
  );
}
