import {findConcept} from "@/lib/knowledge-entities";
import {API_VERSION,apiError,apiJson} from "@/lib/public-api";
import {withPublicApiAccess} from "@/lib/api-access";
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return withPublicApiAccess(request,"/concepts/{slug}",async()=>{const {slug}=await params;const concept=await findConcept(slug);if(!concept)return apiError(request,404,"CONCEPT_NOT_FOUND","No shared concept uses this slug.");return apiJson(request,{apiVersion:API_VERSION,data:concept});});}
