"use client";

import Link from "next/link";
import { useMemo, useState, type PointerEvent, type WheelEvent } from "react";
import type { QuestionGraph, QuestionGraphNode } from "@/data/repository";
import type { RelationshipType } from "@/domain/question";
import styles from "./question-map.module.css";

const relationLabels: Record<RelationshipType, string> = {
  RELATED_TO: "Related to",
  LEADS_TO: "Leads to",
  DEPENDS_ON: "Depends on",
  REFINES: "Refines",
  GENERALIZES: "Generalizes",
  CHALLENGES: "Challenges",
  PRECEDES: "Precedes",
};

type PositionedNode = QuestionGraphNode & { x: number; y: number };

function positionNodes(graph: QuestionGraph): PositionedNode[] {
  const center = graph.nodes.find((node) => node.slug === graph.centerSlug);
  const rings = [
    graph.nodes.filter((node) => node.depth === 1),
    graph.nodes.filter((node) => node.depth >= 2),
  ];
  const positioned: PositionedNode[] = center ? [{ ...center, x: 500, y: 310 }] : [];
  rings.forEach((nodes, ringIndex) => {
    const radiusX = ringIndex === 0 ? 230 : 405;
    const radiusY = ringIndex === 0 ? 175 : 265;
    nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(nodes.length, 1) + ringIndex * 0.16;
      positioned.push({ ...node, x: 500 + Math.cos(angle) * radiusX, y: 310 + Math.sin(angle) * radiusY });
    });
  });
  return positioned;
}

function lines(text: string, limit = 22) {
  const words = text.replace(/\?$/, "").split(" ");
  const result: string[] = [];
  for (const word of words) {
    const last = result.at(-1);
    if (!last || last.length + word.length + 1 > limit) result.push(word);
    else result[result.length - 1] = `${last} ${word}`;
  }
  if (result.length > 3) return [...result.slice(0, 2), `${result[2].slice(0, limit - 1)}…`];
  return result;
}

export function QuestionMap({ graph }: { graph: QuestionGraph }) {
  const nodes = useMemo(() => positionNodes(graph), [graph]);
  const positions = useMemo(() => new Map(nodes.map((node) => [node.slug, node])), [nodes]);
  const types = useMemo(() => [...new Set(graph.edges.map((edge) => edge.type))], [graph.edges]);
  const [enabledTypes, setEnabledTypes] = useState<RelationshipType[]>(types);
  const [selectedSlug, setSelectedSlug] = useState(graph.centerSlug);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const selected = positions.get(selectedSlug) ?? positions.get(graph.centerSlug);
  const visibleEdges = graph.edges.filter((edge) => enabledTypes.includes(edge.type));

  function toggleType(type: RelationshipType) {
    setEnabledTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }
  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest(`.${styles.node}`)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    setOffset({ x: drag.originX + (event.clientX - drag.x) / scale, y: drag.originY + (event.clientY - drag.y) / scale });
  }
  function zoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    setScale((current) => Math.min(1.8, Math.max(0.65, current + (event.deltaY < 0 ? 0.1 : -0.1))));
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div>
          <strong>Relationship map</strong>
          <span>{nodes.length} questions · {graph.edges.length} verified connections</span>
        </div>
        <div className={styles.controls} aria-label="Map controls">
          <button type="button" onClick={() => setScale((value) => Math.min(1.8, value + 0.15))} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setScale((value) => Math.max(0.65, value - 0.15))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
        </div>
      </div>
      <div className={styles.filters} aria-label="Relationship filters">
        {types.map((type) => <button type="button" key={type} className={enabledTypes.includes(type) ? styles.active : ""} onClick={() => toggleType(type)}><i className={styles[type.toLowerCase()]} />{relationLabels[type]}</button>)}
      </div>
      <div className={styles.canvas}>
        <svg viewBox="0 0 1000 620" role="img" aria-labelledby="question-map-title" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onWheel={zoom}>
          <title id="question-map-title">Interactive map of verified relationships around this question</title>
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <g transform={`scale(${scale}) translate(${offset.x} ${offset.y})`}>
            {visibleEdges.map((edge, index) => {
              const source = positions.get(edge.sourceSlug), target = positions.get(edge.targetSlug);
              if (!source || !target) return null;
              return <g className={`${styles.edge} ${styles[edge.type.toLowerCase()]}`} key={`${edge.sourceSlug}-${edge.targetSlug}-${edge.type}-${index}`}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} markerEnd={edge.type === "RELATED_TO" ? undefined : "url(#map-arrow)"} />
                <title>{relationLabels[edge.type]}</title>
              </g>;
            })}
            {nodes.map((node) => {
              const center = node.slug === graph.centerSlug;
              const selectedNode = node.slug === selectedSlug;
              const radius = center ? 76 : node.depth === 1 ? 58 : 45;
              return <g key={node.slug} className={`${styles.node} ${styles[node.status.toLowerCase()]} ${center ? styles.center : ""} ${selectedNode ? styles.selected : ""}`} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`${node.questionText}, ${node.status.replaceAll("_", " ")}`} onClick={() => setSelectedSlug(node.slug)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedSlug(node.slug); }}>
                <circle r={radius} />
                <text textAnchor="middle">{lines(node.questionText, center ? 24 : 19).map((line, index, all) => <tspan x="0" dy={index === 0 ? `${-(all.length - 1) * 0.55}em` : "1.1em"} key={`${line}-${index}`}>{line}</tspan>)}</text>
                {!center && <text className={styles.count} textAnchor="middle" y={radius - 11}>{node.connectionCount} connection{node.connectionCount === 1 ? "" : "s"}</text>}
              </g>;
            })}
          </g>
        </svg>
        {selected && <aside className={styles.preview}>
          <span>{selected.status.replaceAll("_", " ")} · {selected.category}</span>
          <strong>{selected.questionText}</strong>
          <small>{selected.connectionCount} verified connection{selected.connectionCount === 1 ? "" : "s"}</small>
          <Link href={`/questions/${selected.slug}`}>{selected.slug === graph.centerSlug ? "Return to this question" : "Open question"} →</Link>
        </aside>}
      </div>
      <p className={styles.hint}>Drag to move · scroll or use the controls to zoom · select a question to preview it.</p>
    </div>
  );
}
