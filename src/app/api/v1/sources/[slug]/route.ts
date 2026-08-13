import {findSource} from "@/lib/knowledge-entities";
import {API_VERSION,apiError,apiJson} from "@/lib/public-api";
import {withPublicApiAccess} from "@/lib/api-access";
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return withPublicApiAccess(request,"/sources/{slug}",async()=>{const {slug}=await params;const source=await findSource(slug);if(!source)return apiError(request,404,"SOURCE_NOT_FOUND","No shared source uses this slug.");return apiJson(request,{apiVersion:API_VERSION,data:source});});}
