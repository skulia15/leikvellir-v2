# Municipality System Documentation

## Overview

The municipality system provides a searchable dropdown selector for all 64 official Icelandic municipalities, integrated with the official Icelandic registry at `svc.skra.is`.

## Components

### MunicipalitySelector

A reusable dropdown component for selecting Icelandic municipalities.

```tsx
import MunicipalitySelector from "~/components/municipality-selector";

<MunicipalitySelector
  value={municipality}
  onValueChange={setMunicipality}
  placeholder="Select municipality..."
  disabled={false}
/>
```

**Props:**
- `value?: string` - Currently selected municipality name
- `onValueChange: (value: string) => void` - Callback when selection changes
- `placeholder?: string` - Placeholder text (optional)
- `disabled?: boolean` - Disable the selector (optional)
- `className?: string` - Additional CSS classes (optional)

### useMunicipalities Hook

React hook for fetching and managing municipality data.

```tsx
import { useMunicipalities } from "~/lib/api/use-municipalities";

const { municipalities, loading, error, refetch } = useMunicipalities();
```

**Returns:**
- `municipalities: Municipality[]` - Array of all municipalities
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `refetch: () => Promise<void>` - Function to refetch data

## API Integration

### Next.js API Route: `/api/municipalities`

Proxies requests to the official Icelandic registry to avoid CORS issues.

**Features:**
- 24-hour server-side caching
- Error handling with fallbacks
- Automatic data validation

### Direct API Functions

```tsx
import { fetchMunicipalities, findMunicipalityByName } from "~/lib/api/municipalities";

// Get all municipalities (cached)
const municipalities = await fetchMunicipalities();

// Find specific municipality
const reykjavik = await findMunicipalityByName("Reykjavík");
```

## Data Structure

```tsx
interface Municipality {
  svfn: string;        // Official municipality code
  nafn: string;        // Short name (e.g., "Reykjavík")
  fulltnafn: string;   // Full official name (e.g., "Reykjavíkurborg")
}
```

## Geocoding Integration

The system includes automatic municipality normalization from geocoding results:

```tsx
import { reverseGeocode } from "~/lib/geocoding";

const result = await reverseGeocode(64.1466, -21.9426);
// result.municipality will be normalized to official Icelandic municipality name
```

## Form Integration

### Create Playground Form
- Automatic municipality selection based on map coordinates
- Manual override with dropdown selector
- Auto-fills when map pin is moved

### Edit Playground Form  
- Pre-populated with existing municipality
- Same auto-fill functionality as create form

## Translation Support

Full internationalization support with keys in English, Icelandic, and Polish:

```json
{
  "playground": {
    "municipality": "Municipality / Sveitarfélag / Gmina",
    "selectMunicipality": "Select municipality / Veldu sveitarfélag / Wybierz gminę",
    "searchMunicipality": "Search municipality / Leita að sveitarfélagi / Szukaj gminy",
    "noMunicipalityFound": "No municipality found / Ekkert sveitarfélag fannst / Nie znaleziono gminy"
  }
}
```

## Performance Features

- **24-hour caching** at both API and client levels
- **Automatic error recovery** with stale cache fallbacks
- **Preloading support** for better UX
- **Debounced search** in dropdown
- **Alphabetical sorting** for easy browsing

## Error Handling

The system gracefully handles:
- Network failures
- API rate limiting
- Invalid responses  
- Empty data sets
- CORS restrictions (via proxy)

## Testing

Test the municipality selector at: `http://localhost:3000/test-municipality`

## Technical Notes

- Uses official Icelandic registry: `https://svc.skra.is/talnaefni/api/Sveitarfelog`
- Proxied through Next.js API route to avoid CORS
- Client-side caching with 24-hour TTL
- TypeScript support throughout
- Accessible dropdown with keyboard navigation
- Mobile-responsive design

## Usage Examples

### Basic Usage
```tsx
const [municipality, setMunicipality] = useState("");

<MunicipalitySelector
  value={municipality}
  onValueChange={setMunicipality}
/>
```

### With React Hook Form
```tsx
<FormField
  control={form.control}
  name="municipality"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Municipality</FormLabel>
      <FormControl>
        <MunicipalitySelector
          value={field.value}
          onValueChange={field.onChange}
          disabled={isSubmitting}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

### Preloading (Optional)
```tsx
import { preloadMunicipalities } from "~/lib/api/use-municipalities";

// In a layout or page component
useEffect(() => {
  preloadMunicipalities();
}, []);
```

This system provides a professional, performant, and user-friendly way to select Icelandic municipalities with full internationalization support.
