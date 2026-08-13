import { getQuestionRepository } from "@/data/question-service";
import { answerStatuses } from "@/domain/question";
import { API_VERSION, apiError, apiJson, integerParam } from "@/lib/public-api";
import { withPublicApiAccess } from "@/lib/api-access";

export async function GET(request: Request) {
 return withPublicApiAccess(request,"/questions",async()=>{
  const url = new URL(request.url);
  const page = integerParam(url.searchParams.get("page"), 1, 1, 100000);
  const pageSize = integerParam(url.searchParams.get("pageSize"), 20, 1, 50);
  const status = url.searchParams.get("status")?.toUpperCase();
  const sort = url.searchParams.get("sort") ?? "newest";
  if (status && !answerStatuses.includes(status as (typeof answerStatuses)[number]))
    return apiError(request, 400, "INVALID_STATUS", "status must be OPEN, PARTIALLY_ANSWERED, or ANSWERED.");
  if (!["newest", "recently-verified", "most-connected"].includes(sort))
    return apiError(request, 400, "INVALID_SORT", "sort must be newest, recently-verified, or most-connected.");
  const filters = { status, category: url.searchParams.get("category") ?? undefined, tag: url.searchParams.get("tag") ?? undefined, sort: sort as "newest"|"recently-verified"|"most-connected", page, pageSize };
  const repository = await getQuestionRepository();
  const [questions, total] = await Promise.all([repository.list(filters), repository.count(filters)]);
  return apiJson(request, {
    apiVersion: API_VERSION,
    data: questions.map(q => ({ id:q.id,slug:q.slug,title:q.questionText,contextSummary:q.contextSummary,category:{name:q.category,slug:q.categorySlug},tags:q.tags,status:{claimed:q.claimedStatus,verified:q.verifiedStatus,verificationState:q.verificationState},links:{self:`/api/v1/questions/${q.slug}`,relationships:`/api/v1/questions/${q.slug}/relationships`,web:`/questions/${q.slug}`} })),
    pagination: { page,pageSize,total,totalPages:Math.ceil(total/pageSize),hasNext:page*pageSize<total,hasPrevious:page>1 },
    filters: { status:status??null,category:filters.category??null,tag:filters.tag??null,sort },
  });
 });
}
