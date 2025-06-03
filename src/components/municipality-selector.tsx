"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const selectedMunicipality = municipalities.find(m => m.nafn === value);

  // Update button position when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [open]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (open && 
          !buttonRef.current?.contains(target) && 
          !target.closest('.municipality-dropdown-portal')) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  const handleSelect = (municipality: string) => {
    onValueChange(municipality);
    setOpen(false);
  };

  // Render dropdown content
  const dropdownContent = open && buttonRect && (
    <div 
      className="municipality-dropdown-portal fixed bg-popover border rounded-md shadow-md p-0 min-w-[300px] max-w-[400px] max-h-[300px] overflow-hidden"
      style={{
        top: buttonRect.bottom + 4,
        left: buttonRect.left,
        zIndex: 100000,
        width: Math.max(buttonRect.width, 300)
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Command>
        <CommandInput 
          placeholder={t("playground.searchMunicipality")} 
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
        <CommandList>
          <CommandEmpty>
            {t("playground.noMunicipalityFound")}
          </CommandEmpty>
          <CommandGroup>
            {municipalities.map((municipality) => (
              <CommandItem
                key={municipality.svfn}
                value={municipality.nafn}
                onSelect={() => handleSelect(municipality.nafn)}
                className="cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(municipality.nafn);
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
    </div>
  );

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between", className)}
        disabled={disabled || loading}
        onClick={handleToggle}
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
      
      {typeof document !== 'undefined' && dropdownContent && 
        createPortal(dropdownContent, document.body)
      }
    </>
  );
}
