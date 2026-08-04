import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1QuestionRepository } from "./d1-repository";
import { FixtureQuestionRepository } from "./fixture-repository";
import type { QuestionRepository } from "./repository";
import type { CloudflareBindings } from "@/types/cloudflare";

export const getQuestionRepository = cache(async (): Promise<QuestionRepository> => {
  if (process.env.NEXT_PHASE === "phase-production-build" || (process.env.NODE_ENV === "development" && !process.env.USE_CLOUDFLARE_D1)) return new FixtureQuestionRepository();
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: CloudflareBindings };
    return env.DB ? new D1QuestionRepository(env.DB) : new FixtureQuestionRepository();
  } catch {
    return new FixtureQuestionRepository();
  }
});
