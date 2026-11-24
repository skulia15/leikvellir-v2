import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  serializeJsonLd,
  PlaygroundSchema,
  BreadcrumbSchema,
  PlaygroundListSchema,
} from "~/lib/seo/structured-data";

describe("JSON-LD structured data XSS protection", () => {
  describe("serializeJsonLd", () => {
    it("escapes <, >, &, U+2028, and U+2029 characters", () => {
      const payload = {
        xss: "</script><script>alert('xss')</script>",
        amp: "A & B",
        lineSep: "line1\u2028line2",
        paraSep: "para1\u2029para2",
      };

      const serialized = serializeJsonLd(payload);

      expect(serialized).not.toContain("<");
      expect(serialized).not.toContain(">");
      expect(serialized).not.toContain("&");
      expect(serialized).not.toContain("\u2028");
      expect(serialized).not.toContain("\u2029");
      expect(serialized).toContain("\\u003c/script\\u003e");
      expect(serialized).toContain("\\u0026");
      expect(serialized).toContain("\\u2028");
      expect(serialized).toContain("\\u2029");

      // Must remain valid JSON that decodes back to the original object
      expect(JSON.parse(serialized)).toEqual(payload);
    });
  });

  describe("PlaygroundSchema", () => {
    it("prevents </script> breakout from playground name, municipality, and images", () => {
      const html = renderToStaticMarkup(
        <PlaygroundSchema
          playground={{
            id: "42",
            name: 'Róló</script><script>alert("name")</script>',
            municipality: 'Reykjavík<!--</script><img src=x onerror=alert(1)>',
            latitude: 64.1466,
            longitude: -21.9426,
            images: [
              'https://store.public.blob.vercel-storage.com/playgrounds/</script><script>alert(2)</script>.jpg',
            ],
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
            updatedAt: new Date("2025-01-02T00:00:00.000Z"),
          }}
        />,
      );

      // Should have exactly one <script> open and one </script> close tag
      expect(html.match(/<script/gi)).toHaveLength(1);
      expect(html.match(/<\/script>/gi)).toHaveLength(1);

      // Extract JSON-LD body and ensure it parses cleanly
      const match = /<script[^>]*>([\s\S]*)<\/script>/.exec(html);
      expect(match?.[1]).toBeTruthy();
      expect(match![1]).not.toContain("<");
      expect(match![1]).not.toContain(">");
      const parsed = JSON.parse(match![1]!);
      expect(parsed.name).toBe('Róló</script><script>alert("name")</script>');
    });
  });

  describe("BreadcrumbSchema", () => {
    it("escapes hostile payloads in breadcrumb item names and URLs", () => {
      const html = renderToStaticMarkup(
        <BreadcrumbSchema
          items={[
            {
              name: "Home & </script><script>alert(1)</script>",
              url: "https://example.com/?a=1&b=</script>",
            },
          ]}
        />,
      );

      expect(html.match(/<\/script>/gi)).toHaveLength(1);
      const match = /<script[^>]*>([\s\S]*)<\/script>/.exec(html);
      expect(match?.[1]).not.toContain("<");
      expect(match?.[1]).not.toContain("&");
      expect(JSON.parse(match![1]!).itemListElement[0].name).toBe(
        "Home & </script><script>alert(1)</script>",
      );
    });
  });

  describe("PlaygroundListSchema", () => {
    it("escapes hostile payloads in playground list items", () => {
      const html = renderToStaticMarkup(
        <PlaygroundListSchema
          playgrounds={[
            {
              id: 1,
              name: "Park</script><svg onload=alert(1)>",
              municipality: "Kópavogur\u2028\u2029&<>",
            },
          ]}
        />,
      );

      expect(html.match(/<\/script>/gi)).toHaveLength(1);
      const match = /<script[^>]*>([\s\S]*)<\/script>/.exec(html);
      expect(match?.[1]).not.toContain("<");
      expect(match?.[1]).not.toContain(">");
      expect(match?.[1]).not.toContain("&");
      expect(match?.[1]).not.toContain("\u2028");
      expect(match?.[1]).not.toContain("\u2029");
      const parsed = JSON.parse(match![1]!);
      expect(parsed.itemListElement[0].name).toBe(
        "Park</script><svg onload=alert(1)>",
      );
    });
  });
});
