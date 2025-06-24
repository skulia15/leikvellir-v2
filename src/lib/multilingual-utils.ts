import type { MultilingualName } from "~/types";

// Supported languages
export type Language = "is" | "en" | "pl";

/**
 * Get the name in the specified language with fallback to Icelandic
 * @param multilingualName - The multilingual name object
 * @param language - The preferred language
 * @returns The name in the specified language or Icelandic as fallback
 */
export function getLocalizedName(
  multilingualName: MultilingualName,
  language: Language
): string {
  // Try to get the name in the requested language
  const localizedName = multilingualName[language];
  
  // Return the localized name if it exists and is not empty
  if (localizedName && localizedName.trim() !== "") {
    return localizedName;
  }
  
  // Fallback to Icelandic (always required)
  return multilingualName.is;
}

/**
 * Check if a multilingual name has content in a specific language
 * @param multilingualName - The multilingual name object
 * @param language - The language to check
 * @returns True if the language has content
 */
export function hasTranslation(
  multilingualName: MultilingualName,
  language: Language
): boolean {
  const content = multilingualName[language];
  return content !== undefined && content.trim() !== "";
}

/**
 * Get all available languages for a multilingual name
 * @param multilingualName - The multilingual name object
 * @returns Array of languages that have content
 */
export function getAvailableLanguages(
  multilingualName: MultilingualName
): Language[] {
  const languages: Language[] = [];
  
  if (hasTranslation(multilingualName, "is")) languages.push("is");
  if (hasTranslation(multilingualName, "en")) languages.push("en");
  if (hasTranslation(multilingualName, "pl")) languages.push("pl");
  
  return languages;
}

/**
 * Create a multilingual name object with Icelandic as required
 * @param icelandicName - The Icelandic name (required)
 * @param englishName - The English name (optional)
 * @param polishName - The Polish name (optional)
 * @returns A multilingual name object
 */
export function createMultilingualName(
  icelandicName: string,
  englishName?: string,
  polishName?: string
): MultilingualName {
  return {
    is: icelandicName,
    en: englishName && englishName.trim() !== "" ? englishName : undefined,
    pl: polishName && polishName.trim() !== "" ? polishName : undefined,
  };
}

/**
 * Validate that a multilingual name has at least Icelandic content
 * @param multilingualName - The multilingual name object to validate
 * @returns True if valid (has Icelandic content)
 */
export function isValidMultilingualName(multilingualName: unknown): multilingualName is MultilingualName {
  if (!multilingualName || typeof multilingualName !== "object") {
    return false;
  }
  
  const name = multilingualName as Record<string, unknown>;
  return typeof name.is === "string" && name.is.trim() !== "";
}

/**
 * Convert legacy string name to multilingual format
 * @param legacyName - The old string name
 * @returns A multilingual name object with the legacy name as Icelandic
 */
export function convertLegacyName(legacyName: string): MultilingualName {
  return {
    is: legacyName,
    en: undefined,
    pl: undefined,
  };
}

/**
 * Handle both legacy string names and new multilingual names
 * @param name - Either a string (legacy) or MultilingualName object
 * @param language - The preferred language
 * @returns The localized name
 */
export function handleMixedNameFormat(
  name: string | MultilingualName,
  language: Language
): string {
  // If it's a string (legacy format), return it as-is
  if (typeof name === "string") {
    return name;
  }
  
  // If it's a multilingual object, use the localized name
  return getLocalizedName(name, language);
}

/**
 * Get equipment name with proper translation handling
 * This handles both translation keys and direct names
 * @param name - Either a string (legacy) or MultilingualName object  
 * @param language - The preferred language
 * @param translateFn - Translation function to handle translation keys
 * @returns The properly translated equipment name
 */
export function getEquipmentDisplayName(
  name: string | MultilingualName,
  language: Language,
  translateFn: (key: string) => string
): string {
  // Get the localized name first
  const localizedName = handleMixedNameFormat(name, language);
  
  // If the name looks like a translation key (starts with equipment.), translate it
  if (localizedName.startsWith('equipment.')) {
    return translateFn(localizedName);
  }
  
  // Otherwise return the name as-is
  return localizedName;
}