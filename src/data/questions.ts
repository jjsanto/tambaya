import type { PublicQuestion, QuestionRelationship } from "@/domain/question";
import { encyclopedicLayers, extendedThreads } from "./encyclopedic";
import { expandedQuestions, expandedRelationships } from "./expanded-questions";

type Seed = [string, string, string, PublicQuestion["claimedStatus"], string[], boolean?];
const seeds: Seed[] = [
  ["What is consciousness?", "Philosophy", "philosophy", "OPEN", ["mind", "neuroscience", "identity"], true],
  ["Are we alone in the universe?", "Science", "science", "OPEN", ["astronomy", "life", "cosmos"], true],
  ["Is mathematics discovered or invented?", "Mathematics", "mathematics", "OPEN", ["foundations", "philosophy", "patterns"], true],
  ["Can machines understand?", "Technology & AI", "technology-ai", "OPEN", ["artificial-intelligence", "language", "mind"], true],
  ["Why do we dream?", "Psychology & Mind", "psychology-mind", "PARTIALLY_ANSWERED", ["sleep", "memory", "mind"], true],
  ["Is time fundamental?", "Science", "science", "OPEN", ["physics", "cosmology", "time"], true],
  ["What makes something beautiful?", "Philosophy", "philosophy", "OPEN", ["aesthetics", "culture", "perception"], true],
  ["Why is there something rather than nothing?", "Philosophy", "philosophy", "OPEN", ["metaphysics", "cosmology", "existence"], true],
  ["How did language begin?", "History", "history", "PARTIALLY_ANSWERED", ["language", "origins", "culture"]],
  ["What makes a society remember?", "Society", "society", "PARTIALLY_ANSWERED", ["memory", "culture", "history"]],
  ["Can an algorithm be fair?", "Technology & AI", "technology-ai", "PARTIALLY_ANSWERED", ["ethics", "algorithms", "society"]],
  ["What is a number?", "Mathematics", "mathematics", "OPEN", ["foundations", "abstraction", "logic"]],
  ["How do animals navigate?", "Science", "science", "PARTIALLY_ANSWERED", ["biology", "behavior", "earth"]],
  ["What causes an eclipse?", "Science", "science", "ANSWERED", ["astronomy", "observation", "history"]],
  ["How old is the Earth?", "Science", "science", "ANSWERED", ["geology", "deep-time", "measurement"]],
  ["Why do civilizations collapse?", "History", "history", "PARTIALLY_ANSWERED", ["civilization", "systems", "change"]],
  ["Can democracy survive without trust?", "Society", "society", "OPEN", ["democracy", "trust", "institutions"]],
  ["What makes a memory reliable?", "Psychology & Mind", "psychology-mind", "PARTIALLY_ANSWERED", ["memory", "evidence", "perception"]],
  ["Can thinking exist without language?", "Psychology & Mind", "psychology-mind", "OPEN", ["language", "cognition", "mind"]],
  ["Why do humans cooperate?", "Society", "society", "PARTIALLY_ANSWERED", ["cooperation", "evolution", "community"]],
  ["What can never be computed?", "Technology & AI", "technology-ai", "ANSWERED", ["computation", "limits", "logic"]],
  ["Are there different sizes of infinity?", "Mathematics", "mathematics", "ANSWERED", ["infinity", "sets", "foundations"]],
  ["How do new technologies change old questions?", "History", "history", "OPEN", ["technology", "ideas", "change"]],
  ["What makes an explanation satisfying?", "Philosophy", "philosophy", "OPEN", ["knowledge", "explanation", "science"]],
  ["How does attention shape experience?", "Psychology & Mind", "psychology-mind", "PARTIALLY_ANSWERED", ["attention", "perception", "consciousness"]],
  ["Can we predict the limits of prediction?", "Mathematics", "mathematics", "PARTIALLY_ANSWERED", ["prediction", "complexity", "uncertainty"]],
  ["Who gets to define progress?", "Society", "society", "OPEN", ["progress", "power", "values"]],
  ["When did humans begin recording questions?", "History", "history", "PARTIALLY_ANSWERED", ["writing", "inquiry", "archives"]]
];

const commonRefs = (category: string) => [{
  title: `A research guide to questions in ${category}`,
  publisher: "Tambaya Editorial",
  url: "https://www.loc.gov/research-centers/",
  purpose: "BACKGROUND" as const,
}];

type RichStory = Pick<PublicQuestion, "contextSummary" | "origins" | "evolution" | "whyAsked" | "whyItMatters" | "whereItAppears" | "timeline" | "references">;
const richStories: Record<string, RichStory> = {
  "what-is-consciousness": {
    contextSummary: "Across philosophy, medicine, psychology, and neuroscience, consciousness has remained difficult even to define. The question’s history is partly a history of changing boundaries: between waking and sleep, sensation and reflection, organism and machine.",
    origins: "Written traditions contain many inquiries into awareness and experience, but they do not all carve up the subject in the same way. Ancient Greek discussions of soul, South Asian analyses of mind, and early medical observations supplied distinct vocabularies rather than one continuous formulation.",
    evolution: "The question moved from broad accounts of soul and mind toward narrower questions about subjective experience, wakefulness, attention, and self-awareness. Nineteenth-century experimental psychology and twentieth-century brain science added methods that changed what could be observed while leaving disputes about framing intact.",
    whyAsked: "Altered states, dreams, injury, anesthesia, and differences between outward behavior and inward report repeatedly made awareness visible as a problem. Each new way of measuring mind renewed disagreement over what exactly the measurements were measuring.",
    whyItMatters: "How this question is framed influences medicine, animal welfare, theories of personal identity, and debates about artificial systems. It also determines which connected questions researchers treat as meaningful.",
    whereItAppears: "Philosophy of mind, neuroscience, psychology, anesthesiology, cognitive science, animal cognition, contemplative traditions, and artificial intelligence.",
    timeline: [{year:"c. 5th century BCE",title:"Early systematic inquiries",description:"Several philosophical and contemplative traditions develop sustained vocabularies for mind and awareness."},{year:"1879",title:"Experimental psychology",description:"New laboratories help establish controlled study of perception and reported experience."},{year:"Late 20th century",title:"Consciousness returns to the laboratory",description:"New imaging and clinical methods renew interdisciplinary research around the question."}],
    references: [{title:"Consciousness",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/consciousness/",purpose:"BACKGROUND"},{title:"The Neuroscience of Consciousness",publisher:"National Library of Medicine",url:"https://pubmed.ncbi.nlm.nih.gov/?term=neuroscience+of+consciousness",purpose:"HISTORICAL_CONTEXT"}],
  },
  "are-we-alone-in-the-universe": {
    contextSummary: "The possibility of life elsewhere changed from philosophical speculation into an observational research question as astronomy revealed other worlds and chemistry clarified the ingredients available across space.",
    origins: "Arguments about a plurality of worlds appear in ancient atomism and recur in early modern astronomy. These were initially questions about cosmology and humanity’s place in creation, long before observers could study planetary environments beyond Earth.",
    evolution: "The question narrowed through radio astronomy, planetary exploration, studies of extremophiles, and the detection of planets around other stars. It now branches into questions about microbial life, technological signatures, habitability, and the limits of remote observation.",
    whyAsked: "Every expansion of the known cosmos weakened the assumption that Earth occupied a unique physical location. The discovery that complex chemistry is widespread made the distribution of life an increasingly empirical question.",
    whyItMatters: "Even without a resolution, the search changes planetary science, origin-of-life research, and ideas about which environments deserve investigation and protection.",
    whereItAppears: "Astrobiology, planetary science, astronomy, chemistry, philosophy, theology, science fiction, and studies of technological civilizations.",
    timeline: [{year:"1600s",title:"A plurality of worlds",description:"Telescopic astronomy renews debate about whether other worlds might be inhabited."},{year:"1960",title:"Listening begins",description:"Early radio searches establish a technological approach to seeking distant signals."},{year:"1995 onward",title:"Worlds around other stars",description:"Confirmed exoplanets transform the scale and specificity of the question."}],
    references: [{title:"Astrobiology Strategy",publisher:"NASA",url:"https://astrobiology.nasa.gov/research/astrobiology-strategy/",purpose:"BACKGROUND"},{title:"Exoplanet Exploration",publisher:"NASA",url:"https://exoplanets.nasa.gov/",purpose:"TIMELINE"}],
  },
  "is-mathematics-discovered-or-invented": {
    contextSummary: "Mathematical results can feel both created through human notation and encountered as stubborn constraints. The tension has generated a family of questions about objects, proof, language, and the relation between mathematical structure and the physical world.",
    origins: "Classical debates about number, form, and abstraction established enduring contrasts between mathematical entities as independent realities and mathematics as a practice of reasoning from definitions.",
    evolution: "Non-Euclidean geometry, formal logic, set theory, and computing each complicated the older opposition. Attention shifted from numbers alone to axiomatic systems, structures, models, and the activity of mathematical communities.",
    whyAsked: "Mathematicians routinely choose definitions yet discover consequences they did not choose. That combination of freedom and constraint keeps the underlying philosophical question alive.",
    whyItMatters: "The framing affects how people interpret proof, mathematical explanation, abstraction, and the surprising effectiveness of mathematics in science.",
    whereItAppears: "Philosophy of mathematics, logic, foundations, mathematical practice, physics, education, and computer science.",
    timeline: [{year:"Ancient world",title:"Number and form",description:"Systematic accounts connect mathematics with enduring questions about reality and knowledge."},{year:"19th century",title:"Alternative geometries",description:"Consistent non-Euclidean systems reshape assumptions about mathematical necessity."},{year:"20th century",title:"Foundational programs",description:"Logicism, formalism, intuitionism, and structuralism sharpen competing ways to ask the question."}],
    references: [{title:"Philosophy of Mathematics",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/philosophy-mathematics/",purpose:"BACKGROUND"}],
  },
  "can-machines-understand": {
    contextSummary: "As machines began manipulating language, images, and plans, an older question about thought acquired a technological form: what would distinguish successful performance from understanding?",
    origins: "Mechanical calculation prompted early comparisons between formal operations and human reasoning. The modern wording emerged alongside theories of computation and attempts to describe intelligence operationally.",
    evolution: "The question moved from chess and symbolic reasoning to perception, embodied action, statistical learning, and generative systems. Each technical shift changed the examples without producing agreement on the criterion being tested.",
    whyAsked: "Machines increasingly produce behavior once treated as evidence of comprehension. The mismatch between observable capability and uncertain inner description makes the question hard to dismiss and hard to formulate.",
    whyItMatters: "Definitions of understanding shape system evaluation, education, labor, accountability, human–machine interaction, and expectations about future AI.",
    whereItAppears: "Artificial intelligence, philosophy of mind, cognitive science, linguistics, robotics, education, law, and human-computer interaction.",
    timeline: [{year:"1950",title:"An operational reframing",description:"A landmark paper redirects attention toward observable conversational performance."},{year:"1980",title:"Symbols and understanding",description:"A prominent thought experiment intensifies debate over syntax, meaning, and mental attribution."},{year:"2020s",title:"Generative systems",description:"Broad language capabilities bring the question into everyday public use."}],
    references: [{title:"Computing Machinery and Intelligence",publisher:"Mind",url:"https://academic.oup.com/mind/article/LIX/236/433/986238",purpose:"ORIGIN"},{title:"The Chinese Room Argument",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/chinese-room/",purpose:"HISTORICAL_CONTEXT"}],
  },
  "why-do-we-dream": {
    contextSummary: "Dreams have been interpreted as messages, symptoms, cognitive activity, and features of sleeping brains. Modern research can track sleep with increasing precision while the question of why dreaming occurs remains multiply framed.",
    origins: "Dream records occur in some of the earliest written archives. Ritual, medical, and philosophical traditions treated them differently, often asking what dreams signified before asking what produced them.",
    evolution: "The rise of psychology recast dreams around memory, desire, and mental organization. Sleep laboratories later distinguished stages of sleep and made dream reports part of experimental research.",
    whyAsked: "Dreaming combines vivid experience with reduced contact with the external environment. Its emotional force, strange structure, and uneven recall have repeatedly invited explanation.",
    whyItMatters: "The question connects sleep health, memory, emotion, imagination, consciousness, and the interpretation of subjective reports in science.",
    whereItAppears: "Sleep science, psychology, neuroscience, literature, anthropology, psychiatry, and philosophy of mind.",
    timeline: [{year:"Ancient archives",title:"Recorded dream traditions",description:"Written cultures preserve dreams as material for interpretation and inquiry."},{year:"1900",title:"Psychological interpretation",description:"Dreams become central evidence in influential theories of mental life."},{year:"1953",title:"REM sleep described",description:"Laboratory observations establish a new experimental context for dream research."}],
    references: [{title:"Brain Basics: Understanding Sleep",publisher:"NINDS",url:"https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-understanding-sleep",purpose:"BACKGROUND"}],
  },
  "is-time-fundamental": {
    contextSummary: "Time organizes ordinary experience and physical measurement, yet different theories assign it strikingly different roles. The question asks whether time belongs to reality’s basic structure or emerges from something deeper.",
    origins: "Early philosophical accounts distinguished change, sequence, motion, and eternity. Attempts to measure celestial and terrestrial cycles gradually joined these conceptual questions to increasingly precise practices.",
    evolution: "Classical mechanics treated time as a universal parameter; relativity tied temporal measurement to observers and spacetime. Work on thermodynamics and quantum gravity opened further questions about direction and emergence.",
    whyAsked: "Physical laws describe change using time, but attempts to reconcile major theories make time appear differently—or sometimes awkwardly—within their mathematical structures.",
    whyItMatters: "The issue links cosmology, causation, entropy, measurement, and human experience, influencing what physicists seek in more fundamental theories.",
    whereItAppears: "Physics, cosmology, philosophy, thermodynamics, quantum gravity, metaphysics, and cognitive science.",
    timeline: [{year:"1687",title:"Absolute time",description:"Classical mechanics gives time a universal mathematical role."},{year:"1905–1915",title:"Relativistic time",description:"Relativity connects temporal intervals with motion, gravity, and spacetime geometry."},{year:"Late 20th century onward",title:"The problem of time",description:"Quantum-gravity research makes the status of time a central foundational difficulty."}],
    references: [{title:"Time",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/time/",purpose:"BACKGROUND"},{title:"The Problem of Time in Quantum Gravity",publisher:"Living Reviews in Relativity",url:"https://link.springer.com/article/10.12942/lrr-2011-1",purpose:"HISTORICAL_CONTEXT"}],
  },
  "what-makes-something-beautiful": {
    contextSummary: "Beauty has been located in proportion, perception, pleasure, judgment, culture, and social power. The question persists partly because examples travel while standards and vocabularies change.",
    origins: "Ancient discussions linked beauty with order, harmony, excellence, and the good. Other traditions developed their own aesthetic concepts around restraint, impermanence, ornament, performance, and felt response.",
    evolution: "Eighteenth-century aesthetics emphasized judgment and taste; later approaches examined history, institutions, embodiment, and politics. Experimental work now also studies perception without replacing philosophical and cultural inquiry.",
    whyAsked: "People often experience aesthetic judgments as immediate yet disagree across persons, periods, and communities. That combination makes beauty appear both compelling and unstable.",
    whyItMatters: "The question shapes art, design, architecture, bodies, landscapes, cultural preservation, and whose standards receive authority.",
    whereItAppears: "Aesthetics, art history, design, architecture, psychology, anthropology, music, literature, and everyday judgment.",
    timeline: [{year:"Classical antiquity",title:"Harmony and form",description:"Influential accounts relate beauty to proportion, order, and excellence."},{year:"18th century",title:"The problem of taste",description:"Aesthetics develops as a distinct field concerned with judgment and shared standards."},{year:"20th–21st centuries",title:"Plural aesthetic worlds",description:"New movements and disciplines broaden attention to context, power, perception, and participation."}],
    references: [{title:"The Concept of the Aesthetic",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/aesthetic-concept/",purpose:"BACKGROUND"}],
  },
  "why-is-there-something-rather-than-nothing": {
    contextSummary: "This question presses on what counts as an explanation when the subject is existence as a whole. Its apparent simplicity conceals disagreements about possibility, necessity, causation, and whether ‘nothing’ is coherent.",
    origins: "Creation traditions and metaphysical systems long asked why reality has the character it does. The familiar modern formulation became prominent when philosophers treated the existence of anything at all as requiring—or resisting—explanation.",
    evolution: "The question has been reframed through arguments about sufficient reason, necessary beings, logical possibility, cosmology, and the meaning of physical vacuum. These framings do not automatically address the same target.",
    whyAsked: "Ordinary explanations point from one thing to another. Asking about all existence tests whether that explanatory habit has a meaningful endpoint or a boundary.",
    whyItMatters: "It reveals assumptions about explanation itself and connects metaphysics with cosmology without allowing either field’s vocabulary to settle the other’s question by definition.",
    whereItAppears: "Metaphysics, philosophy of religion, cosmology, logic, theology, and discussions of scientific explanation.",
    timeline: [{year:"Ancient and medieval thought",title:"Existence and first principles",description:"Philosophical and theological systems develop accounts of why reality depends—or does not depend—on deeper grounds."},{year:"1714",title:"A famous formulation",description:"The question receives an influential explicit statement within a principle-of-reason argument."},{year:"20th century onward",title:"Language, logic, and cosmology",description:"New approaches dispute both the question’s meaning and the forms an explanation could take."}],
    references: [{title:"The Cosmological Argument",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/cosmological-argument/",purpose:"HISTORICAL_CONTEXT"},{title:"Nothingness",publisher:"Stanford Encyclopedia of Philosophy",url:"https://plato.stanford.edu/entries/nothingness/",purpose:"BACKGROUND"}],
  },
};

const reviewed = { provenance: "EDITORIAL" as const, reviewedAt: "2026-08-04", answerLeakState: "PASSED" as const };
const editorialReview: PublicQuestion["editorialReview"] = { SUMMARY: reviewed, ORIGINS: reviewed, EVOLUTION: reviewed, WHY_ASKED: reviewed, WHY_IT_MATTERS: reviewed, WHERE_IT_APPEARS: reviewed };

const originalQuestions: PublicQuestion[] = seeds.map(([questionText, category, categorySlug, status, tags, featured], index) => {
  const slug = questionText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fallback: RichStory = {
    contextSummary: `A question that has travelled through ${category.toLowerCase()}, gathering new meanings as the tools and language of inquiry changed.`,
    origins: `Recognizable forms of this question appear across the historical record. Its precise wording is modern, but the curiosity behind it reaches across generations and traditions.`,
    evolution: `Different communities have narrowed, reframed, and challenged the question. Each framing changes what counts as evidence without settling the central inquiry here.`,
    whyAsked: `People returned to this question when new observations, social changes, or conceptual tools made an old uncertainty newly visible.`,
    whyItMatters: `The question matters because the way it is framed shapes research, public choices, and the connected questions that become possible.`,
    whereItAppears: `${category}, interdisciplinary research, education, and public debate.`,
    timeline: [
      { year: "Origins", title: "Early formulations", description: "Related forms of the question enter recorded inquiry." },
      { year: "Modern era", title: "A changing vocabulary", description: "New disciplines give the question more precise language." },
      { year: "Today", title: "An active question", description: "Contemporary tools continue to reshape how people ask it." },
    ],
    references: commonRefs(category),
  };
  const story = richStories[slug] ?? fallback;
  const layer = encyclopedicLayers[slug];
  const coreSections: PublicQuestion["storySections"] = [
    { id: "origins", kicker: "Origins", title: "Where the question begins", paragraphs: [story.origins], review: editorialReview.ORIGINS },
    { id: "evolution", kicker: "Historical development", title: "How the question evolved", paragraphs: [story.evolution], review: editorialReview.EVOLUTION },
    { id: "why-asked", kicker: "Conditions of inquiry", title: "Why people started asking", paragraphs: [story.whyAsked], review: editorialReview.WHY_ASKED },
    { id: "why-it-matters", kicker: "Significance", title: "Why the question matters", paragraphs: [story.whyItMatters], review: editorialReview.WHY_IT_MATTERS },
    { id: "where-it-appears", kicker: "Across fields", title: "Where the question appears", paragraphs: [story.whereItAppears], review: editorialReview.WHERE_IT_APPEARS },
  ];
  return {
    id: String(index + 1), slug, questionText, category, categorySlug, tags,
    claimedStatus: status, verifiedStatus: status, verificationState: "VERIFIED", featured,
    ...story, editorialReview,
    storySections: [...coreSections, ...(layer?.sections.map(section => ({ ...section, review: reviewed })) ?? []), ...(extendedThreads[slug]?.map(section => ({ ...section, review: reviewed })) ?? [])],
    people: layer?.people ?? [], keyTerms: layer?.keyTerms ?? [], branches: layer?.branches ?? [],
  };
});

export const questions: PublicQuestion[] = [...originalQuestions, ...expandedQuestions];

export const relationships: QuestionRelationship[] = [...[
  ["what-is-consciousness", "can-thinking-exist-without-language", "LEADS_TO"],
  ["what-is-consciousness", "how-does-attention-shape-experience", "RELATED_TO"],
  ["why-do-we-dream", "what-makes-a-memory-reliable", "RELATED_TO"],
  ["can-machines-understand", "can-thinking-exist-without-language", "DEPENDS_ON"],
  ["can-machines-understand", "can-an-algorithm-be-fair", "LEADS_TO"],
  ["is-mathematics-discovered-or-invented", "what-is-a-number", "DEPENDS_ON"],
  ["what-is-a-number", "are-there-different-sizes-of-infinity", "LEADS_TO"],
  ["what-can-never-be-computed", "can-we-predict-the-limits-of-prediction", "RELATED_TO"],
  ["what-makes-a-society-remember", "why-do-civilizations-collapse", "RELATED_TO"],
  ["can-democracy-survive-without-trust", "why-do-humans-cooperate", "DEPENDS_ON"],
  ["how-did-language-begin", "can-thinking-exist-without-language", "LEADS_TO"],
  ["is-time-fundamental", "why-is-there-something-rather-than-nothing", "RELATED_TO"],
  ["what-makes-something-beautiful", "what-makes-an-explanation-satisfying", "RELATED_TO"],
  ["how-do-new-technologies-change-old-questions", "can-machines-understand", "LEADS_TO"]
].map(([sourceSlug, targetSlug, type]) => ({ sourceSlug, targetSlug, type })) as QuestionRelationship[], ...expandedRelationships];

export const categories = [...new Map(questions.map(q => [q.categorySlug, q.category])).entries()]
  .map(([slug, name]) => ({ slug, name, count: questions.filter(q => q.categorySlug === slug).length }));

export function getQuestion(slug: string) { return questions.find(q => q.slug === slug); }
export function getRelated(slug: string) {
  const edges = relationships.filter(r => r.sourceSlug === slug || r.targetSlug === slug);
  return edges.map(edge => ({ edge, question: getQuestion(edge.sourceSlug === slug ? edge.targetSlug : edge.sourceSlug)! }));
}
export function searchQuestions(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return questions;
  return questions.filter(q => terms.every(term => [q.questionText, q.category, q.contextSummary, ...q.tags].join(" ").toLowerCase().includes(term)));
}
