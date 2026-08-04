import Image from "next/image";
import type { StoryBlock } from "@/domain/question";

const safeUrl = (value?: string) => value && (/^https:\/\//i.test(value) || value.startsWith("/")) ? value : undefined;

export function StoryBlocks({ blocks }: { blocks: StoryBlock[] }) {
  return <div className="story-blocks">{blocks.map((block, index) => {
    if (block.type === "PARAGRAPH") return <p key={index}>{block.text}</p>;
    if (block.type === "HEADING") return block.level === 4 ? <h4 key={index}>{block.text}</h4> : <h3 key={index}>{block.text}</h3>;
    if (block.type === "IMAGE") { const src = safeUrl(block.src); if (!src) return null; const figure = <figure key={index}><Image src={src} alt={block.alt} width={1200} height={760} unoptimized/><figcaption>{block.caption && <span>{block.caption}</span>}{block.credit && <small>{block.credit}</small>}</figcaption></figure>; const source = safeUrl(block.sourceUrl); return source ? <a className="story-figure-link" href={source} target="_blank" rel="noreferrer" key={index}>{figure}</a> : figure; }
    if (block.type === "TABLE") return <figure className="story-table" key={index}>{block.caption && <figcaption>{block.caption}</figcaption>}<div><table><thead><tr>{block.headers.map((header, cell) => <th scope="col" key={cell}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_, cell) => <td key={cell}>{row[cell] ?? ""}</td>)}</tr>)}</tbody></table></div></figure>;
    if (block.type === "LIST") { const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>); return block.style === "ORDERED" ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>; }
    if (block.type === "QUOTE") return <blockquote className="story-quote" key={index}><p>{block.text}</p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>;
    return <aside className={`story-callout ${block.tone.toLowerCase()}`} key={index}>{block.title && <strong>{block.title}</strong>}<p>{block.text}</p></aside>;
  })}</div>;
}
