import {findPerson} from "@/lib/knowledge-entities";
import {API_VERSION,apiError,apiJson} from "@/lib/public-api";
import {withPublicApiAccess} from "@/lib/api-access";
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return withPublicApiAccess(request,"/people/{slug}",async()=>{const {slug}=await params;const person=await findPerson(slug);if(!person)return apiError(request,404,"PERSON_NOT_FOUND","No shared person uses this slug.");return apiJson(request,{apiVersion:API_VERSION,data:person});});}
