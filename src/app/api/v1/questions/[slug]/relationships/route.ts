import { getQuestionRepository } from "@/data/question-service";
import { API_VERSION, apiError, apiJson } from "@/lib/public-api";
import { withPublicApiAccess } from "@/lib/api-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
 return withPublicApiAccess(request,"/questions/{slug}/relationships",async()=>{
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
      displayLabel: item.edge.sourceSlug === slug ? item.edge.type : ({LEADS_TO:"FOLLOWS_FROM",DEPENDS_ON:"SUPPORTS",REFINES:"IS_REFINED_BY",GENERALIZES:"IS_GENERALIZED_BY",CHALLENGES:"IS_CHALLENGED_BY",PRECEDES:"FOLLOWS",RELATED_TO:"RELATED_TO"} as Record<string,string>)[item.edge.type],
      canonicalType: item.edge.type === "GENERALIZES" ? "REFINES" : item.edge.type,
      confidence: item.edge.confidence ?? null,
      verification: item.edge.verified ? "VERIFIED" : "UNVERIFIED",
      rationale: item.edge.rationale || null,
      evidence: item.edge.evidenceNote ? { note:item.edge.evidenceNote, url:item.edge.evidenceUrl || null } : null,
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
 });
}
