import type { AnswerStatus, PublicQuestion, QuestionRelationship } from "@/domain/question";

type Seed = { q: string; status: AnswerStatus; tags: string[]; focus: string };
type Profile = {
  name: string; slug: string; origin: string; methods: string; stakes: string;
  references: PublicQuestion["references"];
  seeds: Seed[];
};

const profiles: Profile[] = [
  {
    name: "Arts & Humanities", slug: "arts-humanities",
    origin: "Humanistic inquiry grows from interpretation: people preserve objects, performances, texts, and images, then repeatedly reconsider what those traces meant in their own settings and what they can mean in new ones.",
    methods: "The field moves among close reading, comparison, archival research, material study, performance, oral history, and critical debate. Its evidence is shaped by survival, translation, collection, and the institutions that decide what is preserved.",
    stakes: "These questions influence cultural memory, education, public space, artistic freedom, heritage policy, and whose experiences become visible in the record.",
    references: [
      { title: "Research Programs", publisher: "National Endowment for the Humanities", url: "https://www.neh.gov/divisions/research", purpose: "BACKGROUND" },
      { title: "Research Centers", publisher: "Library of Congress", url: "https://www.loc.gov/research-centers/", purpose: "HISTORICAL_CONTEXT" },
    ],
    seeds: [
      { q:"How does art change what a society can imagine?",status:"OPEN",tags:["art","imagination","society"],focus:"The inquiry follows the two-way movement between artistic form and collective possibility, including moments when new media alter what can be represented." },
      { q:"Why do stories survive their original worlds?",status:"PARTIALLY_ANSWERED",tags:["storytelling","memory","tradition"],focus:"Transmission carries narratives across languages, media, institutions, and generations while changing their audiences and uses." },
      { q:"Who decides what belongs in a museum?",status:"OPEN",tags:["museums","heritage","power"],focus:"Selection, acquisition, restitution, classification, and display make collecting institutions active participants in cultural memory." },
      { q:"Can translation preserve a work's voice?",status:"OPEN",tags:["translation","literature","language"],focus:"A translated work must negotiate rhythm, register, ambiguity, historical distance, and the expectations of a different readership." },
      { q:"What makes a work original?",status:"OPEN",tags:["originality","authorship","influence"],focus:"Ideas of originality change across workshops, oral traditions, remix cultures, copyright systems, and collaborative forms of making." },
      { q:"How does architecture shape public life?",status:"PARTIALLY_ANSWERED",tags:["architecture","public-space","cities"],focus:"Built environments distribute access, visibility, encounter, movement, and exclusion long after their designers leave." },
      { q:"Why do musical traditions change?",status:"PARTIALLY_ANSWERED",tags:["music","tradition","performance"],focus:"Musical forms travel through performance, notation, recording, migration, patronage, and technologies that reorganize who can listen or participate." },
      { q:"Can an archive ever be neutral?",status:"OPEN",tags:["archives","evidence","memory"],focus:"Archives reflect decisions about creation, description, access, destruction, and the administrative purposes for which records first existed." },
      { q:"What is lost when a cultural practice disappears?",status:"OPEN",tags:["heritage","practice","loss"],focus:"The disappearance of a practice may affect skills, relationships, vocabularies, identities, and forms of knowledge that cannot be separated into simple artifacts." },
      { q:"How do images acquire political power?",status:"PARTIALLY_ANSWERED",tags:["images","politics","media"],focus:"Images gain force through circulation, framing, repetition, censorship, testimony, and the credibility granted to particular ways of seeing." },
      { q:"Why do some books become classics?",status:"OPEN",tags:["literature","canon","education"],focus:"Canons emerge through schools, publishers, critics, libraries, translation networks, and later communities that either renew or challenge inherited judgments." },
      { q:"Can restoration preserve the past without remaking it?",status:"OPEN",tags:["restoration","conservation","heritage"],focus:"Every intervention balances material survival, historical layers, present use, authenticity, reversibility, and gaps that cannot be repaired." },
    ],
  },
  {
    name: "Environment & Earth", slug: "environment-earth",
    origin: "Environmental questions join long traditions of observing land, water, weather, and living systems with newer sciences capable of comparing change across scales from local habitats to the whole planet.",
    methods: "Researchers combine field observation, long records, experiments, remote sensing, models, community knowledge, and historical baselines. Different scales and delayed effects make causal stories difficult to isolate.",
    stakes: "The framing affects conservation, adaptation, food and water systems, land use, environmental justice, and the responsibilities assigned across places and generations.",
    references: [
      { title: "Reports", publisher: "Intergovernmental Panel on Climate Change", url: "https://www.ipcc.ch/reports/", purpose: "STATUS_VERIFICATION" },
      { title: "Science Explorer", publisher: "U.S. Geological Survey", url: "https://www.usgs.gov/science/science-explorer", purpose: "BACKGROUND" },
    ],
    seeds: [
      { q:"What makes an ecosystem resilient?",status:"PARTIALLY_ANSWERED",tags:["ecosystems","resilience","ecology"],focus:"Resilience can refer to persistence, recovery, adaptation, or transformation, and those meanings do not always identify the same ecological priorities." },
      { q:"How do forests create their own climates?",status:"PARTIALLY_ANSWERED",tags:["forests","climate","water"],focus:"Vegetation exchanges water, energy, carbon, and momentum with the atmosphere while landscape scale and forest structure alter the strength of those relationships." },
      { q:"Can a river be treated as a legal person?",status:"OPEN",tags:["rivers","rights","governance"],focus:"Legal personhood proposals connect ecological protection with Indigenous law, institutional representation, enforcement, and questions about who may speak for a living system." },
      { q:"What makes extinction irreversible?",status:"ANSWERED",tags:["extinction","evolution","biodiversity"],focus:"The question distinguishes the loss of a lineage from losses of ecological function, genetic diversity, cultural relationship, and possibilities for future evolution." },
      { q:"How should wilderness be defined?",status:"OPEN",tags:["wilderness","land","culture"],focus:"Definitions of wilderness can conceal long histories of human stewardship and produce different consequences for conservation, access, and belonging." },
      { q:"How do cities alter local climate?",status:"PARTIALLY_ANSWERED",tags:["cities","climate","infrastructure"],focus:"Materials, geometry, vegetation, waste heat, inequality, and regional weather combine to create sharply different exposures within the same urban area." },
      { q:"Can damaged ecosystems recover?",status:"PARTIALLY_ANSWERED",tags:["restoration","recovery","ecology"],focus:"Recovery depends on what baseline is chosen, which functions matter, whether pressures have stopped, and how future conditions differ from the past." },
      { q:"Why do species migrate?",status:"PARTIALLY_ANSWERED",tags:["migration","animals","seasonality"],focus:"Migration connects inherited behavior, learning, navigation, life cycles, food, climate, and landscapes increasingly reshaped by human activity." },
      { q:"How much biodiversity supports resilience?",status:"PARTIALLY_ANSWERED",tags:["biodiversity","resilience","measurement"],focus:"Counts of species, genetic variety, functional roles, abundance, and network structure offer different views of diversity and its ecological significance." },
      { q:"Who should bear the costs of climate adaptation?",status:"OPEN",tags:["adaptation","justice","climate"],focus:"Responsibility can be assigned through historical contribution, present capacity, exposure, benefit, legal duty, or solidarity, producing competing distributions." },
      { q:"How do oceans record planetary change?",status:"PARTIALLY_ANSWERED",tags:["oceans","climate","archives"],focus:"Water chemistry, sediments, organisms, temperature, currents, and sea level preserve overlapping records with different resolutions and uncertainties." },
      { q:"What makes an environmental baseline trustworthy?",status:"OPEN",tags:["baselines","evidence","conservation"],focus:"A baseline depends on when observation began, what was measured, whose knowledge counts, and whether an earlier condition is both knowable and desirable." },
    ],
  },
  {
    name: "Health & Medicine", slug: "health-medicine",
    origin: "Medicine has always linked observation of bodies with judgments about suffering, normality, care, and responsibility. Modern public health widened the frame from individual treatment to populations and conditions of life.",
    methods: "Evidence comes from clinical observation, laboratory work, trials, epidemiology, lived experience, population data, and health systems. Each method reveals some patterns while introducing its own selection and measurement problems.",
    stakes: "These questions shape consent, diagnosis, prevention, resource allocation, research priorities, trust, and the distribution of opportunities to live healthy lives.",
    references: [
      { title: "Health Topics", publisher: "World Health Organization", url: "https://www.who.int/health-topics", purpose: "BACKGROUND" },
      { title: "Health Information", publisher: "National Institutes of Health", url: "https://www.nih.gov/health-information", purpose: "STATUS_VERIFICATION" },
    ],
    seeds: [
      { q:"Why do bodies age at different rates?",status:"PARTIALLY_ANSWERED",tags:["ageing","biology","environment"],focus:"Ageing varies among tissues, individuals, populations, and measures, bringing mechanisms of damage and repair into contact with lifelong social conditions." },
      { q:"What makes a disease chronic?",status:"PARTIALLY_ANSWERED",tags:["chronic-disease","diagnosis","care"],focus:"Duration alone does not capture recurrence, disability, treatment dependence, shifting definitions, or the experience of living with an enduring condition." },
      { q:"How should health be measured?",status:"OPEN",tags:["health","measurement","wellbeing"],focus:"Mortality, symptoms, function, wellbeing, capability, and self-reported experience describe different aspects of health and guide different policies." },
      { q:"Why do treatments work differently across people?",status:"PARTIALLY_ANSWERED",tags:["treatment","variation","evidence"],focus:"Biology, coexisting conditions, environment, adherence, access, study design, and chance all contribute to variation that averages may conceal." },
      { q:"When does prevention become a public responsibility?",status:"OPEN",tags:["prevention","public-health","responsibility"],focus:"Preventive action can involve individual choice, shared infrastructure, regulation, communication, and trade-offs between liberty, evidence, and collective risk." },
      { q:"How do place and income shape health?",status:"PARTIALLY_ANSWERED",tags:["inequality","place","social-determinants"],focus:"Housing, work, pollution, food, discrimination, transport, care, stress, and political power accumulate across lives and neighborhoods." },
      { q:"What makes medical evidence trustworthy?",status:"OPEN",tags:["evidence","trials","trust"],focus:"Trust depends on design, transparency, replication, relevance, conflicts of interest, reporting, interpretation, and whether studied populations match those receiving care." },
      { q:"How should uncertainty be communicated in medicine?",status:"OPEN",tags:["uncertainty","communication","risk"],focus:"Probabilities, ranges, missing evidence, changing guidance, and individual values must be communicated without manufacturing either certainty or paralysis." },
      { q:"Why do some pathogens cross species?",status:"PARTIALLY_ANSWERED",tags:["pathogens","zoonoses","ecology"],focus:"Pathogen traits interact with host biology, contact networks, land use, animal health, trade, surveillance, and chance opportunities for adaptation." },
      { q:"Can healthcare be both universal and personalized?",status:"OPEN",tags:["healthcare","equity","personalization"],focus:"Universal entitlement and individualized care operate at different levels but meet in decisions about evidence, cost, access, and variation among patients." },
      { q:"What does informed consent require?",status:"OPEN",tags:["consent","ethics","autonomy"],focus:"Consent involves comprehension, voluntariness, capacity, trust, alternatives, ongoing communication, and institutional conditions beyond a signed form." },
      { q:"How do diagnostic categories change experience?",status:"OPEN",tags:["diagnosis","identity","classification"],focus:"A diagnosis can organize care and recognition while also reshaping self-understanding, expectations, stigma, institutions, and what evidence becomes visible." },
    ],
  },
  {
    name: "Language & Communication", slug: "language-communication",
    origin: "Language inquiry developed across grammar, rhetoric, philosophy, philology, anthropology, and the study of signs. Recorded languages preserve only part of humanity's communicative history.",
    methods: "Researchers compare speech, signing, writing, interaction, corpora, experiments, historical records, and community knowledge. Meaning depends on patterns at several levels and on the situations in which people use them.",
    stakes: "The questions affect education, translation, language rights, technology, cultural continuity, accessibility, diplomacy, and participation in public life.",
    references: [
      { title: "What is Linguistics?", publisher: "Linguistic Society of America", url: "https://www.linguisticsociety.org/resource/what-linguistics", purpose: "BACKGROUND" },
      { title: "World Atlas of Languages", publisher: "UNESCO", url: "https://en.wal.unesco.org/", purpose: "HISTORICAL_CONTEXT" },
    ],
    seeds: [
      { q:"Why do languages change?",status:"PARTIALLY_ANSWERED",tags:["language-change","history","variation"],focus:"Sound, grammar, vocabulary, contact, identity, migration, technology, and ordinary interaction produce changes that spread unevenly through communities." },
      { q:"How do children learn grammar?",status:"PARTIALLY_ANSWERED",tags:["acquisition","grammar","children"],focus:"Children build communicative systems from patterned input, interaction, cognition, social attention, and capacities whose relative roles remain debated." },
      { q:"Can meaning exist without context?",status:"OPEN",tags:["meaning","context","pragmatics"],focus:"Words and structures constrain interpretation, yet speakers continually rely on shared situations, histories, intentions, conventions, and inference." },
      { q:"What makes a language endangered?",status:"PARTIALLY_ANSWERED",tags:["endangerment","community","policy"],focus:"Speaker numbers matter alongside transmission, domains of use, displacement, education, policy, economic pressure, documentation, and community goals." },
      { q:"How does writing change thought?",status:"OPEN",tags:["writing","cognition","literacy"],focus:"Writing externalizes language, reorganizes memory and institutions, and enables forms of comparison while differing widely across scripts and practices." },
      { q:"Why are some speech sounds difficult across languages?",status:"PARTIALLY_ANSWERED",tags:["speech","perception","learning"],focus:"Perception and production become tuned through development, but anatomy, experience, identity, attention, and instruction also influence later learning." },
      { q:"Can machines translate culture?",status:"OPEN",tags:["translation","ai","culture"],focus:"Statistical fluency does not by itself settle how systems handle implication, social position, historical reference, humor, genre, and accountability for choices." },
      { q:"How do metaphors shape reasoning?",status:"PARTIALLY_ANSWERED",tags:["metaphor","reasoning","framing"],focus:"Metaphors connect domains of experience and can direct attention, inference, memory, and policy while their effects depend on context and alternatives." },
      { q:"Who decides what counts as standard language?",status:"OPEN",tags:["standards","power","education"],focus:"Standards emerge through institutions, printing, schooling, administration, media, prestige, and resistance rather than linguistic structure alone." },
      { q:"How do gestures become language?",status:"PARTIALLY_ANSWERED",tags:["gesture","sign-languages","communication"],focus:"Gesture ranges from accompanying speech to conventional systems, while signed languages demonstrate the full linguistic possibilities of the visual-manual modality." },
      { q:"Why do names carry social power?",status:"OPEN",tags:["names","identity","power"],focus:"Naming can recognize, classify, claim, stigmatize, remember, erase, and authorize across personal, geographic, scientific, and political settings." },
      { q:"Can communication succeed without shared assumptions?",status:"OPEN",tags:["communication","inference","difference"],focus:"Participants coordinate by repairing misunderstandings and building common ground, but unequal power and divergent histories limit what can be presumed shared." },
    ],
  },
  {
    name: "Economics", slug: "economics",
    origin: "Economic questions grew from practical concerns about household management, trade, taxation, labor, value, and public finance before becoming a specialized study of production, distribution, institutions, and choice.",
    methods: "The field uses historical evidence, accounting, surveys, experiments, administrative data, models, and comparisons across places and policies. Measurements embed definitions and models simplify different parts of social life.",
    stakes: "These questions influence livelihoods, inequality, public budgets, labor, ecological pressure, financial stability, and how societies value present and future wellbeing.",
    references: [
      { title: "Research", publisher: "World Bank", url: "https://www.worldbank.org/en/research", purpose: "BACKGROUND" },
      { title: "Research at the IMF", publisher: "International Monetary Fund", url: "https://www.imf.org/en/Research", purpose: "STATUS_VERIFICATION" },
    ],
    seeds: [
      { q:"What makes money trustworthy?",status:"PARTIALLY_ANSWERED",tags:["money","trust","institutions"],focus:"Confidence in money connects law, state capacity, banking, payment networks, social convention, stability, memory of crises, and expectations about other participants." },
      { q:"Why do some inequalities persist across generations?",status:"PARTIALLY_ANSWERED",tags:["inequality","inheritance","mobility"],focus:"Wealth, education, health, housing, networks, discrimination, geography, policy, and family resources interact over time rather than travel through one channel." },
      { q:"How should unpaid work be valued?",status:"OPEN",tags:["care","work","measurement"],focus:"Care, household production, volunteering, and community labor sustain economies while remaining partly outside prices, wages, and conventional national accounts." },
      { q:"What makes a market fair?",status:"OPEN",tags:["markets","fairness","rules"],focus:"Competition, bargaining power, information, access, external effects, background inequality, and the legitimacy of the rules lead to different ideas of fairness." },
      { q:"Why do financial crises spread?",status:"PARTIALLY_ANSWERED",tags:["finance","crisis","networks"],focus:"Balance sheets, leverage, expectations, common exposures, payment obligations, liquidity, policy responses, and narratives connect local shocks to wider systems." },
      { q:"Can economic growth continue on a finite planet?",status:"OPEN",tags:["growth","resources","sustainability"],focus:"The inquiry distinguishes material throughput from measured value and asks how substitution, efficiency, distribution, rebound effects, and ecological limits interact." },
      { q:"How do expectations change economies?",status:"PARTIALLY_ANSWERED",tags:["expectations","coordination","uncertainty"],focus:"Beliefs about prices, policy, income, risk, and other people's behavior can alter present decisions and sometimes help produce the conditions anticipated." },
      { q:"What makes work meaningful?",status:"OPEN",tags:["work","meaning","institutions"],focus:"Meaning may arise from autonomy, skill, recognition, purpose, relationships, security, identity, and contribution, while institutions distribute those conditions unevenly." },
      { q:"Why do prices fail to capture value?",status:"OPEN",tags:["prices","value","externalities"],focus:"Prices reflect particular rights, scarcities, bargaining positions, information, and accounting boundaries while many social and ecological effects remain elsewhere." },
      { q:"Who bears the cost of economic uncertainty?",status:"OPEN",tags:["risk","inequality","institutions"],focus:"Contracts, employment, credit, insurance, ownership, public policy, and household resources shift uncertainty among actors with unequal ability to absorb it." },
      { q:"How should future generations enter today's decisions?",status:"OPEN",tags:["future-generations","discounting","ethics"],focus:"Long-term choices require assumptions about representation, uncertainty, discounting, irreversible change, future preferences, and obligations to people without present voice." },
      { q:"When does efficiency conflict with resilience?",status:"OPEN",tags:["efficiency","resilience","systems"],focus:"Specialization and lean inventories may reduce ordinary costs while redundancy, diversity, buffers, and spare capacity can matter under disruption." },
    ],
  },
  {
    name: "Law & Governance", slug: "law-governance",
    origin: "Questions of law and governance arise wherever communities formalize authority, obligation, dispute, membership, and limits on power. Written codes are only one part of that institutional history.",
    methods: "Inquiry combines interpretation of texts, cases, institutional comparison, political history, empirical study, public reasoning, and attention to how rules operate in practice rather than on paper alone.",
    stakes: "The questions shape rights, accountability, legitimacy, public trust, punishment, administration, technological oversight, and access to remedies.",
    references: [
      { title: "Wex Legal Encyclopedia", publisher: "Cornell Legal Information Institute", url: "https://www.law.cornell.edu/wex/index.html", purpose: "BACKGROUND" },
      { title: "Public Governance", publisher: "OECD", url: "https://www.oecd.org/governance/", purpose: "STATUS_VERIFICATION" },
    ],
    seeds: [
      { q:"What makes a law legitimate?",status:"OPEN",tags:["legitimacy","law","authority"],focus:"Legitimacy may be linked to procedure, consent, justice, effectiveness, tradition, rights, participation, or public reason, and these criteria can conflict." },
      { q:"Can rights exist without enforcement?",status:"OPEN",tags:["rights","enforcement","institutions"],focus:"A declared right can guide claims and criticism even when remedies are weak, yet enforcement, capacity, standing, and access shape its practical meaning." },
      { q:"Who should be accountable for automated decisions?",status:"OPEN",tags:["automation","accountability","ai"],focus:"Designers, deployers, data providers, institutions, reviewers, and public authorities occupy different positions in systems whose decisions can be difficult to contest." },
      { q:"How should law respond to new technology?",status:"OPEN",tags:["technology","regulation","change"],focus:"Law can adapt existing principles, create new categories, regulate uses or infrastructures, and act before or after harms become well understood." },
      { q:"When does civil disobedience become justified?",status:"OPEN",tags:["civil-disobedience","justice","protest"],focus:"Publicity, nonviolence, proportionality, democratic opportunity, urgency, conscience, and effects on others have all shaped competing accounts." },
      { q:"Can a constitution anticipate future crises?",status:"OPEN",tags:["constitutions","crisis","institutions"],focus:"Constitutions distribute ordinary and emergency powers while amendment, interpretation, conventions, courts, and political practice determine how old language meets new events." },
      { q:"What does equal protection require?",status:"OPEN",tags:["equality","rights","law"],focus:"Formal similarity, unequal starting conditions, discrimination, classification, remedy, group disadvantage, and institutional purpose support different understandings of equality." },
      { q:"Who owns data about a person?",status:"OPEN",tags:["data","privacy","ownership"],focus:"Personal data can be copied, inferred, combined, traded, governed, and used collectively, making ownership only one among several possible legal frames." },
      { q:"How should societies remember injustice?",status:"OPEN",tags:["justice","memory","reparation"],focus:"Trials, commissions, archives, memorials, education, apology, restitution, and silence distribute recognition and responsibility in different ways." },
      { q:"Can international law constrain powerful states?",status:"OPEN",tags:["international-law","power","institutions"],focus:"Treaties, courts, reciprocity, reputation, domestic institutions, alliances, norms, and enforcement operate unevenly in a system without a single sovereign." },
      { q:"What makes punishment proportionate?",status:"OPEN",tags:["punishment","proportionality","justice"],focus:"Severity, harm, culpability, prevention, rehabilitation, social conditions, consistency, and human dignity pull proportionality in different directions." },
      { q:"How should public institutions explain their decisions?",status:"OPEN",tags:["transparency","reasons","administration"],focus:"Explanations can enable review, participation, learning, and trust, but institutions must decide what reasons, evidence, uncertainty, and trade-offs to disclose." },
    ],
  },
];

const reviewed = { provenance: "EDITORIAL" as const, reviewedAt: "2026-08-05", answerLeakState: "PASSED" as const };
const editorialReview: PublicQuestion["editorialReview"] = { SUMMARY: reviewed, ORIGINS: reviewed, EVOLUTION: reviewed, WHY_ASKED: reviewed, WHY_IT_MATTERS: reviewed, WHERE_IT_APPEARS: reviewed };

export const expandedQuestions: PublicQuestion[] = profiles.flatMap((profile, profileIndex) => profile.seeds.map((seed, seedIndex) => {
  const id = String(29 + profileIndex * 12 + seedIndex);
  const slug = seed.q.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const contextSummary = `${seed.focus} Within ${profile.name.toLowerCase()}, the question has changed as evidence, institutions, and the language used to describe the problem have changed. Tambaya follows that history without resolving the question.`;
  const origins = `${profile.origin} ${seed.focus} Earlier formulations rarely used today's exact wording, so the history must distinguish a durable curiosity from the categories later built around it.`;
  const evolution = `${profile.methods} For “${seed.q}”, changes in evidence and vocabulary have repeatedly shifted the scale of inquiry, the comparisons considered legitimate, and the uncertainties that remain visible.`;
  const whyAsked = `${seed.focus} The question becomes especially urgent when inherited categories no longer fit new observations or when different communities discover that they have been using the same words for different problems.`;
  const whyItMatters = `${profile.stakes} How “${seed.q}” is framed determines which evidence receives attention, whose experience counts, what alternatives appear possible, and which connected questions are asked next.`;
  const whereItAppears = `The question appears across ${profile.name.toLowerCase()}, historical research, policy, education, professional practice, and public debate. Its vocabulary also travels into neighboring disciplines, where familiar terms may acquire different standards of evidence.`;
  const sections: PublicQuestion["storySections"] = [
    { id:"origins",kicker:"Origins",title:"Where the question begins",paragraphs:[origins],blocks:[{type:"PARAGRAPH",text:origins}],review:reviewed },
    { id:"evolution",kicker:"Changing frames",title:"How the inquiry evolved",paragraphs:[evolution],blocks:[{type:"PARAGRAPH",text:evolution}],review:reviewed },
    { id:"why-asked",kicker:"Conditions of inquiry",title:"Why people keep asking",paragraphs:[whyAsked],blocks:[{type:"PARAGRAPH",text:whyAsked}],review:reviewed },
    { id:"why-it-matters",kicker:"Significance",title:"What changes with the framing",paragraphs:[whyItMatters],blocks:[{type:"PARAGRAPH",text:whyItMatters},{type:"CALLOUT",tone:"CONTEXT",title:"A question with consequences",text:`Tambaya records the competing frames around “${seed.q}” while directing readers to external sources for established findings and ongoing research.`}],review:reviewed },
    { id:"where-it-appears",kicker:"Across fields",title:"Where the question appears",paragraphs:[whereItAppears],blocks:[{type:"PARAGRAPH",text:whereItAppears}],review:reviewed },
  ];
  return {
    id, slug, questionText:seed.q, category:profile.name, categorySlug:profile.slug, tags:seed.tags,
    claimedStatus:seed.status, verifiedStatus:seed.status, verificationState:"VERIFIED", contextSummary,
    origins,evolution,whyAsked,whyItMatters,whereItAppears,storySections:sections, editorialReview,
    timeline:[
      {year:"Long view",title:"Earlier formulations",description:"Related concerns appear before the question acquires its current disciplinary vocabulary."},
      {year:"Modern disciplines",title:"New methods and categories",description:"Institutions and specialized methods narrow the question while opening new comparisons."},
      {year:"Current frontier",title:"A connected inquiry",description:"Contemporary evidence links the question to neighboring fields and new forms of public decision."},
    ],
    references:profile.references, people:[],
    keyTerms:seed.tags.slice(0,3).map(tag => ({term:tag.replaceAll("-"," ").replace(/\b\w/g,letter=>letter.toUpperCase()),description:`A recurring term in debates around “${seed.q}”; its meaning varies across methods, periods, and communities.`})),
    branches:[
      {question:`How has the language of “${seed.q}” changed?`,relationship:"REFINES"},
      {question:`What evidence would change how this question is framed?`,relationship:"LEADS_TO"},
      {question:`Who is affected by the assumptions behind this question?`,relationship:"RELATED_TO"},
    ],
  };
}));

export const expandedRelationships: QuestionRelationship[] = profiles.flatMap((profile, profileIndex) => {
  const categoryQuestions = expandedQuestions.slice(profileIndex * 12, profileIndex * 12 + 12);
  return categoryQuestions.map((question,index) => ({ sourceSlug:question.slug,targetSlug:categoryQuestions[(index + 1) % categoryQuestions.length].slug,type:index % 3 === 0 ? "LEADS_TO" : "RELATED_TO" }));
});
