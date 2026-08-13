import { getQuestionRepository } from "@/data/question-service";
import { API_VERSION, apiError, apiJson } from "@/lib/public-api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const repository = await getQuestionRepository();
  const question = await repository.findBySlug(slug);
  if (!question)
    return apiError(
      request,
      404,
      "QUESTION_NOT_FOUND",
      "No published question uses this slug.",
    );
  const related = await repository.related(slug);
  return apiJson(request, {
    apiVersion: API_VERSION,
    data: related.map((item) => ({
      type: item.edge.type,
      direction: item.edge.sourceSlug === slug ? "OUTGOING" : "INCOMING",
      sourceSlug: item.edge.sourceSlug,
      targetSlug: item.edge.targetSlug,
      question: {
        slug: item.question.slug,
        title: item.question.questionText,
        category: {
          name: item.question.category,
          slug: item.question.categorySlug,
        },
        status: item.question.verifiedStatus,
      },
      links: { question: `/api/v1/questions/${item.question.slug}` },
    })),
  });
}
