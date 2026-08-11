import type { AnswerStatus, PublicQuestion, QuestionRelationship } from "@/domain/question";

type Profile = { name:string; slug:string; topics:string[]; source:[string,string,string] };

const profiles: Profile[] = [
  {name:"Science",slug:"science",source:["Science Topics","National Academies","https://www.nationalacademies.org/topics"],topics:["the origin of biological complexity","planetary climate systems","animal sensory worlds","the formation of galaxies","microbial communities","the physics of turbulence","the evolution of cooperation","the chemistry of early Earth","biological regeneration","scientific measurement"]},
  {name:"Philosophy",slug:"philosophy",source:["Stanford Encyclopedia of Philosophy","Stanford University","https://plato.stanford.edu/"],topics:["personal identity","moral responsibility","collective knowledge","the nature of possibility","practical wisdom","the limits of reason","intergenerational justice","human dignity","causal explanation","intellectual humility"]},
  {name:"Mathematics",slug:"mathematics",source:["Mathematics Subject Classification","American Mathematical Society","https://mathscinet.ams.org/mathscinet/msc/msc2020.html"],topics:["mathematical symmetry","the structure of infinity","computational complexity","mathematical randomness","geometric spaces","the foundations of probability","mathematical proof","dynamic systems","mathematical optimization","the language of abstraction"]},
  {name:"Technology & AI",slug:"technology-ai",source:["AI Risk Management Framework","NIST","https://www.nist.gov/itl/ai-risk-management-framework"],topics:["machine autonomy","algorithmic accountability","digital identity","automated scientific discovery","human-computer collaboration","privacy-preserving computation","critical digital infrastructure","synthetic media","robotic decision-making","technology governance"]},
  {name:"Psychology & Mind",slug:"psychology-mind",source:["Topics in Psychology","American Psychological Association","https://www.apa.org/topics"],topics:["human attention","emotional development","autobiographical memory","social belonging","creative thought","habit formation","psychological resilience","moral cognition","language acquisition","the experience of time"]},
  {name:"History",slug:"history",source:["Research Guides","Library of Congress","https://guides.loc.gov/"],topics:["ancient urban life","maritime exchange","the history of childhood","migration networks","the circulation of scientific ideas","historical food systems","the growth of bureaucracies","the history of public health","changing concepts of citizenship","the preservation of archives"]},
  {name:"Society",slug:"society",source:["Social and Human Sciences","UNESCO","https://www.unesco.org/en/social-human-sciences"],topics:["social trust","community resilience","intergenerational relationships","urban belonging","collective action","social inequality","public rituals","informal care networks","cultural identity","institutional legitimacy"]},
  {name:"Arts & Humanities",slug:"arts-humanities",source:["Research Programs","National Endowment for the Humanities","https://www.neh.gov/divisions/research"],topics:["oral storytelling","architectural memory","musical interpretation","literary translation","the cultural life of images","theatre and public life","digital preservation","artistic authorship","museum collections","the evolution of genre"]},
  {name:"Environment & Earth",slug:"environment-earth",source:["Science Explorer","U.S. Geological Survey","https://www.usgs.gov/science/science-explorer"],topics:["watershed resilience","soil biodiversity","coastal adaptation","forest succession","urban ecosystems","freshwater scarcity","species migration","environmental restoration","ocean circulation","community conservation"]},
  {name:"Health & Medicine",slug:"health-medicine",source:["Health Topics","World Health Organization","https://www.who.int/health-topics"],topics:["chronic pain","population ageing","healthcare access","diagnostic uncertainty","patient-centred care","infectious disease surveillance","mental health prevention","medical rehabilitation","nutrition across the lifespan","public health communication"]},
  {name:"Language & Communication",slug:"language-communication",source:["What is Linguistics?","Linguistic Society of America","https://www.linguisticsociety.org/resource/what-linguistics"],topics:["multilingual communication","language revitalization","the evolution of writing","conversational meaning","signed languages","scientific terminology","language and social identity","machine-mediated communication","historical sound change","metaphorical thought"]},
  {name:"Economics",slug:"economics",source:["Research and Publications","OECD","https://www.oecd.org/en/publications.html"],topics:["economic resilience","the future of work","household decision-making","public investment","global supply networks","the care economy","market concentration","intergenerational wealth","environmental valuation","financial trust"]},
  {name:"Law & Governance",slug:"law-governance",source:["International Law and Justice","United Nations","https://www.un.org/en/global-issues/international-law-and-justice"],topics:["democratic representation","administrative accountability","digital rights","emergency governance","international cooperation","access to justice","constitutional interpretation","public participation","regulatory legitimacy","transitional justice"]},
];

const templates = [
  (topic:string) => `How has ${topic} changed over time?`,
  (topic:string) => `What shapes the development of ${topic}?`,
  (topic:string) => `Why does ${topic} vary across places and communities?`,
  (topic:string) => `How can ${topic} be studied across different scales?`,
  (topic:string) => `What makes evidence about ${topic} reliable?`,
  (topic:string) => `Which assumptions influence how ${topic} is understood?`,
  (topic:string) => `How does ${topic} connect with neighbouring questions?`,
  (topic:string) => `What remains uncertain about ${topic}?`,
  (topic:string) => `How do institutions shape inquiry into ${topic}?`,
  (topic:string) => `What can comparisons reveal about ${topic}?`,
  (topic:string) => `How have new tools changed research on ${topic}?`,
  (topic:string) => `Whose perspectives are missing from accounts of ${topic}?`,
  (topic:string) => `What makes explanations of ${topic} persuasive?`,
  (topic:string) => `How should uncertainty about ${topic} be communicated?`,
  (topic:string) => `What historical turning points reshaped ${topic}?`,
  (topic:string) => `Which connected questions clarify ${topic}?`,
];

const reviewed = {provenance:"EDITORIAL" as const,reviewedAt:"2026-08-11",answerLeakState:"PASSED" as const};
const editorialReview: PublicQuestion["editorialReview"] = {SUMMARY:reviewed,ORIGINS:reviewed,EVOLUTION:reviewed,WHY_ASKED:reviewed,WHY_IT_MATTERS:reviewed,WHERE_IT_APPEARS:reviewed};
const slugify = (value:string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const candidates = templates.flatMap((template,templateIndex) => profiles.flatMap(profile => profile.topics.map(topic => ({template,templateIndex,profile,topic}))));

export const bulkQuestions: PublicQuestion[] = candidates.slice(0,2000).map(({template,templateIndex,profile,topic},index) => {
  const questionText = template(topic);
  const status: AnswerStatus = (index + templateIndex) % 5 === 0 ? "OPEN" : "PARTIALLY_ANSWERED";
  const topicTag = slugify(topic).split("-").slice(0,3).join("-");
  const tags = [profile.slug,topicTag,templateIndex % 2 ? "methods" : "evidence"];
  const contextSummary = `This question examines ${topic} through the changing evidence and vocabulary of ${profile.name.toLowerCase()}. It traces how methods, institutions, and perspectives have reframed the inquiry, identifies connections with neighbouring questions, and preserves the uncertainties that remain without presenting a proposed answer.`;
  const origins = `Questions about ${topic} first took shape through practical experience, inherited knowledge, and attempts to compare recurring patterns. The present formulation belongs to a later vocabulary: archives, institutions, and specialized methods gradually separated concerns that earlier communities often treated together, while leaving important continuities open to interpretation.`;
  const evolution = `The inquiry developed as researchers gained new records, instruments, conceptual distinctions, and opportunities for comparison. Each shift made some aspects of ${topic} more visible while changing the scale of analysis and the standards applied to evidence. Competing fields still organize the problem differently rather than sharing one final formulation.`;
  const whyAsked = `People keep asking about ${topic} when established categories no longer fit observations, when new capabilities expose an old uncertainty, or when institutions must act before evidence is complete. The question therefore moves between specialist research and public experience, gathering different priorities as it crosses communities and historical settings.`;
  const whyItMatters = `How ${topic} is framed influences research priorities, education, professional practice, and public choices. Definitions determine what gets measured, whose experience becomes visible, and which consequences receive attention. Following those choices helps distinguish the history of the inquiry from any particular claim offered in response to it.`;
  const whereItAppears = `The question appears in ${profile.name.toLowerCase()}, interdisciplinary research, education, policy, and professional practice. Its vocabulary also circulates through journalism and everyday discussion, where familiar terms can carry different meanings. Careful comparison is needed when evidence and concepts travel between those settings.`;
  const storySections: PublicQuestion["storySections"] = [
    {id:"origins",kicker:"Origins",title:"Where the question begins",paragraphs:[origins],blocks:[{type:"PARAGRAPH",text:origins}],review:reviewed},
    {id:"evolution",kicker:"Changing frames",title:"How the inquiry evolved",paragraphs:[evolution],blocks:[{type:"PARAGRAPH",text:evolution}],review:reviewed},
    {id:"why-asked",kicker:"Conditions of inquiry",title:"Why people keep asking",paragraphs:[whyAsked],blocks:[{type:"PARAGRAPH",text:whyAsked}],review:reviewed},
    {id:"why-it-matters",kicker:"Significance",title:"What changes with the framing",paragraphs:[whyItMatters],blocks:[{type:"PARAGRAPH",text:whyItMatters}],review:reviewed},
    {id:"where-it-appears",kicker:"Across fields",title:"Where the question appears",paragraphs:[whereItAppears],blocks:[{type:"PARAGRAPH",text:whereItAppears}],review:reviewed},
  ];
  return {id:`bulk-2026-${String(index+1).padStart(4,"0")}`,slug:slugify(questionText),questionText,category:profile.name,categorySlug:profile.slug,tags,claimedStatus:status,verifiedStatus:status,verificationState:"VERIFIED",contextSummary,origins,evolution,whyAsked,whyItMatters,whereItAppears,storySections,editorialReview,
    timeline:[{year:"Earlier formulations",title:"The inquiry takes shape",description:`Communities identify recurring concerns related to ${topic} before a shared technical vocabulary develops.`},{year:"Disciplinary development",title:"Methods and definitions change",description:"Specialized evidence enables narrower comparisons and exposes disagreements about the question's boundaries."},{year:"Contemporary inquiry",title:"New connections emerge",description:"Current work links the question across fields, institutions, and forms of public decision-making."}],
    references:[{title:profile.source[0],publisher:profile.source[1],url:profile.source[2],purpose:"BACKGROUND"},{title:"Research Centers",publisher:"Library of Congress",url:"https://www.loc.gov/research-centers/",purpose:"HISTORICAL_CONTEXT"}],people:[],
    keyTerms:[{term:topic.replace(/\b\w/g,letter=>letter.toUpperCase()),description:`The central subject of “${questionText}”, whose boundaries differ across methods and historical settings.`},{term:"Evidence",description:`The records, observations, comparisons, and measures used to investigate ${topic}.`},{term:"Framing",description:"The definitions and assumptions that determine which parts of the question become visible."}],
    branches:[{question:`How did the vocabulary of ${topic} develop?`,relationship:"REFINES"},{question:`What evidence could reframe inquiry into ${topic}?`,relationship:"LEADS_TO"},{question:`Who experiences ${topic} differently?`,relationship:"RELATED_TO"}],
  } satisfies PublicQuestion;
});

const questionsByCategory = new Map<string,PublicQuestion[]>();
for (const question of bulkQuestions) questionsByCategory.set(question.categorySlug,[...(questionsByCategory.get(question.categorySlug) ?? []),question]);
export const bulkRelationships: QuestionRelationship[] = bulkQuestions.map((question,index) => {
  const peers = questionsByCategory.get(question.categorySlug)!;
  const peerIndex = peers.findIndex(candidate=>candidate.slug===question.slug);
  return {sourceSlug:question.slug,targetSlug:peers[(peerIndex+1)%peers.length].slug,type:index%4===0?"LEADS_TO":"RELATED_TO"};
});
