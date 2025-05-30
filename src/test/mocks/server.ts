// test/mocks/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// HTTP API mocks
const httpHandlers = [
  // Mock file upload endpoint
  http.post("/api/upload", async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return HttpResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Simulate successful upload
    return HttpResponse.json({
      success: true,
      url: `/uploads/playgrounds/test_${Date.now()}_${file.name}`,
      filename: `test_${Date.now()}_${file.name}`,
    });
  }),

  // Mock file delete endpoint
  http.delete("/api/upload", () => {
    return HttpResponse.json({ success: true });
  }),
];

// Create MSW server
export const server = setupServer(...httpHandlers);
