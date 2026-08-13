import { getCloudflareContext } from "@opennextjs/cloudflare";
import { editorialHeaders,hasEditorialAccess,unauthorized } from "@/lib/editorial-auth";
import { indexQuestionBatch,semanticIndexStatus } from "@/lib/semantic-relationships";
import type { CloudflareBindings } from "@/types/cloudflare";

export async function POST(request:Request){
  const {env}=(await getCloudflareContext({async:true})) as unknown as {env:CloudflareBindings};
  if(!(await hasEditorialAccess(request,env))) return unauthorized();
  const body=await request.json().catch(()=>({})) as {cursor?:unknown;limit?:unknown;force?:unknown};
  try{
    const result=await indexQuestionBatch(env,String(body.cursor??""),Number(body.limit??20),body.force===true);
    return Response.json(result,{headers:editorialHeaders});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Indexing failed."},{status:503,headers:editorialHeaders});
  }
}
export async function GET(request:Request){const {env}=(await getCloudflareContext({async:true})) as unknown as {env:CloudflareBindings};if(!(await hasEditorialAccess(request,env)))return unauthorized();return Response.json(await semanticIndexStatus(env),{headers:editorialHeaders});}
