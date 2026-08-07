import styles from "./question-maturity.module.css";

export type MaturityFacts = {
  asked: boolean;
  context: boolean;
  sources: boolean;
  relationships: boolean;
  verified: boolean;
};
const stages = [
  ["asked", "Asked", "The question has been clearly framed."],
  ["context", "Context", "An encyclopedic Story provides background."],
  ["sources", "Sources", "References support the Story."],
  ["relationships", "Relationships", "It is connected to other questions."],
  ["verified", "Verified", "Editors have verified and published it."],
] as const;
export function QuestionMaturity({ facts }: { facts: MaturityFacts }) {
  const completed = stages.filter(([key]) => facts[key]).length;
  const current = Math.min(completed, stages.length - 1);
  return (
    <section
      className={styles.maturity}
      aria-label={`Question maturity: ${completed} of ${stages.length} stages`}
    >
      <div className={styles.header}>
        <strong>Question maturity</strong>
        <span>
          {completed} of {stages.length} stages
        </span>
      </div>
      <div className={styles.stages}>
        {stages.map(([key, label, description], index) => (
          <div
            className={styles.stage}
            data-complete={facts[key]}
            data-current={index === current && !facts.verified}
            key={key}
          >
            <span>
              {facts[key] ? "✓ " : ""}
              {label}
            </span>
            <small>{description}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
