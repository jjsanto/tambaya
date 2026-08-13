import { API_VERSION, apiJson } from "@/lib/public-api";

export async function GET(request: Request) {
  return apiJson(request, {
    apiVersion: API_VERSION,
    name: "Tambaya Public API",
    description:
      "Read-only access to published questions. Tambaya publishes questions, not answers.",
    documentation: "/developers/api",
    openapi: "/api/v1/openapi.json",
    endpoints: {
      questions: "/api/v1/questions",
      categories: "/api/v1/categories",
      tags: "/api/v1/tags",
      people: "/api/v1/people/{slug}",
      concepts: "/api/v1/concepts/{slug}",
      sources: "/api/v1/sources/{slug}",
    },
  });
}
