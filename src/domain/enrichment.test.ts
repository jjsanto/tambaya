import { describe, expect, it } from "vitest";
import { parseEnrichmentProposal } from "./enrichment";

const proposal = { sections: [1,2,3].map(index => ({ key:`part-${index}`, kicker:"Historical context", title:`A field of inquiry ${index}`, paragraph:"Researchers have framed this question in changing ways across several disciplines, periods, and institutions, making its vocabulary and boundaries part of the history of inquiry.", listItems:["A tradition to investigate"], callout:"This proposal maps the question without resolving it." })), suggestedStatus:"OPEN", statusConfidence:"LOW", statusRationale:"The available framing suggests that editorial verification should concentrate on whether an established consensus exists elsewhere.", sourceLeads:[] };

describe("enrichment proposals", () => {
  it("normalizes safe proposals into rich Story sections", () => { const result = parseEnrichmentProposal(proposal); expect(result.sections).toHaveLength(3); expect(result.sections[0].blocks).toHaveLength(3); });
  it("rejects answer leakage before it reaches the editor", () => { const unsafe = structuredClone(proposal); unsafe.sections[0].paragraph = "The definitive answer is something the public page should never reveal, despite this otherwise sufficiently long paragraph for validation."; expect(() => parseEnrichmentProposal(unsafe)).toThrow(/rejected/); });
});
