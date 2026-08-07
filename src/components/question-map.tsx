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

type PositionedNode = QuestionGraphNode & { x: number; y: number; radius: number };

function positionNodes(graph: QuestionGraph): PositionedNode[] {
  const ordered = [...graph.nodes].sort((a, b) => a.depth - b.depth || b.connectionCount - a.connectionCount || a.slug.localeCompare(b.slug));
  const positioned = ordered.map<PositionedNode>((node, index) => {
    const center = node.slug === graph.centerSlug;
    const angle = index * 2.399963229728653;
    const initialDistance = center ? 0 : node.depth === 1 ? 190 : 320;
    return {
      ...node,
      x: center ? 500 : 500 + Math.cos(angle) * initialDistance,
      y: center ? 290 : 290 + Math.sin(angle) * initialDistance * 0.68,
      radius: center ? 64 : Math.min(50, 40 + Math.sqrt(Math.max(1, node.connectionCount)) * 3),
    };
  });
  const bySlug = new Map(positioned.map((node) => [node.slug, node]));
  for (let iteration = 0; iteration < 180; iteration += 1) {
    const movement = new Map(positioned.map((node) => [node.slug, { x: 0, y: 0 }]));
    for (let leftIndex = 0; leftIndex < positioned.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < positioned.length; rightIndex += 1) {
        const left = positioned[leftIndex], right = positioned[rightIndex];
        let dx = right.x - left.x, dy = right.y - left.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance === 1) { dx = 1; dy = 0; }
        const minimum = left.radius + right.radius + 35;
        const force = Math.min(16, 8500 / (distance * distance) + Math.max(0, minimum - distance) * 0.16);
        const fx = (dx / distance) * force, fy = (dy / distance) * force;
        movement.get(left.slug)!.x -= fx; movement.get(left.slug)!.y -= fy;
        movement.get(right.slug)!.x += fx; movement.get(right.slug)!.y += fy;
      }
    }
    for (const edge of graph.edges) {
      const source = bySlug.get(edge.sourceSlug), target = bySlug.get(edge.targetSlug);
      if (!source || !target) continue;
      const dx = target.x - source.x, dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = source.depth === 0 || target.depth === 0 ? 185 : 150;
      const force = (distance - desired) * 0.025;
      const fx = (dx / distance) * force, fy = (dy / distance) * force;
      movement.get(source.slug)!.x += fx; movement.get(source.slug)!.y += fy;
      movement.get(target.slug)!.x -= fx; movement.get(target.slug)!.y -= fy;
    }
    for (const edge of graph.edges) {
      const source = bySlug.get(edge.sourceSlug), target = bySlug.get(edge.targetSlug);
      if (!source || !target) continue;
      const edgeX = target.x - source.x, edgeY = target.y - source.y;
      const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
      if (edgeLengthSquared < 1) continue;
      for (const node of positioned) {
        if (node.slug === source.slug || node.slug === target.slug) continue;
        const projection = Math.max(0.08, Math.min(0.92, ((node.x - source.x) * edgeX + (node.y - source.y) * edgeY) / edgeLengthSquared));
        const closestX = source.x + edgeX * projection, closestY = source.y + edgeY * projection;
        let awayX = node.x - closestX, awayY = node.y - closestY;
        let distance = Math.hypot(awayX, awayY);
        const clearance = node.radius + 24;
        if (distance >= clearance) continue;
        if (distance < 1) {
          const direction = node.slug.localeCompare(source.slug) < 0 ? -1 : 1;
          awayX = (-edgeY / Math.sqrt(edgeLengthSquared)) * direction;
          awayY = (edgeX / Math.sqrt(edgeLengthSquared)) * direction;
          distance = 1;
        }
        const force = (clearance - distance) * 0.28;
        movement.get(node.slug)!.x += (awayX / distance) * force;
        movement.get(node.slug)!.y += (awayY / distance) * force;
      }
    }
    for (const node of positioned) {
      if (node.slug === graph.centerSlug) { node.x = 500; node.y = 290; continue; }
      const move = movement.get(node.slug)!;
      const cooling = 1 - iteration / 220;
      node.x += (move.x + (500 - node.x) * 0.0015) * cooling;
      node.y += (move.y + (290 - node.y) * 0.0015) * cooling;
      node.x = Math.max(node.radius + 30, Math.min(970 - node.radius, node.x));
      node.y = Math.max(node.radius + 25, Math.min(555 - node.radius, node.y));
    }
  }
  return positioned;
}

function lines(text: string, limit = 22, maximum = 3) {
  const words = text.replace(/\?$/, "").split(" ");
  const result: string[] = [];
  for (const word of words) {
    const last = result.at(-1);
    if (!last || last.length + word.length + 1 > limit) result.push(word);
    else result[result.length - 1] = `${last} ${word}`;
  }
  if (result.length > maximum) {
    const visible = result.slice(0, maximum);
    visible[maximum - 1] = `${visible[maximum - 1].slice(0, limit - 1)}…`;
    return visible;
  }
  return result;
}

const inverseRelationLabels: Record<RelationshipType, string> = {
  RELATED_TO: "Is related to",
  LEADS_TO: "Is reached from",
  DEPENDS_ON: "Is required by",
  REFINES: "Is refined by",
  GENERALIZES: "Is a specific case of",
  CHALLENGES: "Is challenged by",
  PRECEDES: "Comes after",
};

function relationshipPhrase(edge: QuestionGraph["edges"][number], fromSlug: string) {
  return edge.sourceSlug === fromSlug ? relationLabels[edge.type] : inverseRelationLabels[edge.type];
}

function findPath(graph: QuestionGraph, start: string, end: string, allowed: Set<string>) {
  if (start === end) return [];
  const queue: { slug: string; path: { edge: QuestionGraph["edges"][number]; from: string; to: string }[] }[] = [{ slug: start, path: [] }];
  const visited = new Set([start]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of graph.edges) {
      if (!allowed.has(edge.type)) continue;
      const next = edge.sourceSlug === current.slug ? edge.targetSlug : edge.targetSlug === current.slug ? edge.sourceSlug : "";
      if (!next || visited.has(next)) continue;
      const path = [...current.path, { edge, from: current.slug, to: next }];
      if (next === end) return path;
      visited.add(next);
      queue.push({ slug: next, path });
    }
  }
  return [];
}

export function QuestionMap({ graph }: { graph: QuestionGraph }) {
  const nodes = useMemo(() => positionNodes(graph), [graph]);
  const positions = useMemo(() => new Map(nodes.map((node) => [node.slug, node])), [nodes]);
  const types = useMemo(() => [...new Set(graph.edges.map((edge) => edge.type))], [graph.edges]);
  const [enabledTypes, setEnabledTypes] = useState<RelationshipType[]>(types);
  const [showDepthTwo, setShowDepthTwo] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(graph.centerSlug);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const selected = positions.get(selectedSlug) ?? positions.get(graph.centerSlug);
  const visibleNodes = nodes.filter((node) => showDepthTwo || node.depth <= 1);
  const visibleSlugs = new Set(visibleNodes.map((node) => node.slug));
  const visibleEdges = graph.edges.filter((edge) => enabledTypes.includes(edge.type) && visibleSlugs.has(edge.sourceSlug) && visibleSlugs.has(edge.targetSlug));
  const selectedNeighbors = new Set(visibleEdges.flatMap((edge) => edge.sourceSlug === selectedSlug ? [edge.targetSlug] : edge.targetSlug === selectedSlug ? [edge.sourceSlug] : []));
  const selectedPath = selected ? findPath(graph, graph.centerSlug, selected.slug, new Set(enabledTypes)) : [];

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
          <span>{visibleNodes.length} questions · {visibleEdges.length} verified connections</span>
        </div>
        <div className={styles.controls} aria-label="Map controls">
          <button type="button" onClick={() => setScale((value) => Math.min(1.8, value + 0.15))} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setScale((value) => Math.max(0.65, value - 0.15))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
        </div>
      </div>
      <div className={styles.guide}>
        <div><i className={styles.currentKey} /><span><strong>Current question</strong>Your starting point</span></div>
        <div><i className={styles.openKey} /><span><strong>Open</strong>No established answer</span></div>
        <div><i className={styles.partialKey} /><span><strong>Partially answered</strong>Some aspects resolved</span></div>
        <div><i className={styles.answeredKey} /><span><strong>Answered</strong>Established answers exist</span></div>
        {nodes.some((node) => node.depth > 1) && <button type="button" onClick={() => { setShowDepthTwo((value) => !value); setSelectedSlug(graph.centerSlug); }}>{showDepthTwo ? "Show direct only" : "Explore one level deeper"} →</button>}
      </div>
      <div className={styles.filters} aria-label="Relationship filters">
        <span>Show relationships</span>
        {types.map((type) => <button type="button" key={type} className={enabledTypes.includes(type) ? styles.active : ""} onClick={() => toggleType(type)}><i className={styles[type.toLowerCase()]} />{relationLabels[type]}</button>)}
      </div>
      <div className={styles.workspace}>
        <div className={styles.canvas}><svg viewBox="0 0 1000 620" role="img" aria-labelledby="question-map-title" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onWheel={zoom}>
          <title id="question-map-title">Interactive map of verified relationships around this question</title>
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          </defs>
          <g transform={`scale(${scale}) translate(${offset.x} ${offset.y})`}>
            {visibleEdges.map((edge, index) => {
              const source = positions.get(edge.sourceSlug), target = positions.get(edge.targetSlug);
              if (!source || !target) return null;
              const dx = target.x - source.x, dy = target.y - source.y;
              const distance = Math.max(1, Math.hypot(dx, dy));
              const startInset = source.radius + 7, endInset = target.radius + (edge.type === "RELATED_TO" ? 7 : 13);
              const startX = source.x + (dx / distance) * startInset, startY = source.y + (dy / distance) * startInset;
              const endX = target.x - (dx / distance) * endInset, endY = target.y - (dy / distance) * endInset;
              const highlighted = edge.sourceSlug === selectedSlug || edge.targetSlug === selectedSlug;
              return <g className={`${styles.edge} ${styles[edge.type.toLowerCase()]} ${highlighted ? styles.highlighted : styles.subdued}`} key={`${edge.sourceSlug}-${edge.targetSlug}-${edge.type}-${index}`}>
                <path d={`M ${startX} ${startY} L ${endX} ${endY}`} markerEnd={edge.type === "RELATED_TO" ? undefined : "url(#map-arrow)"} />
                <title>{relationLabels[edge.type]}</title>
              </g>;
            })}
            {visibleNodes.map((node) => {
              const center = node.slug === graph.centerSlug;
              const selectedNode = node.slug === selectedSlug;
              const subdued = !selectedNode && !selectedNeighbors.has(node.slug);
              return <a key={node.slug} href={`/questions/${node.slug}`} aria-current={center ? "page" : undefined} aria-label={`Open ${node.questionText}`} onMouseEnter={() => setSelectedSlug(node.slug)} onFocus={() => setSelectedSlug(node.slug)} onClick={(event) => { if (center) event.preventDefault(); }}>
                <g className={`${styles.node} ${styles[node.status.toLowerCase()]} ${center ? styles.center : ""} ${selectedNode ? styles.selected : ""} ${subdued ? styles.subduedNode : ""}`} transform={`translate(${node.x} ${node.y})`}>
                  <circle className={styles.nodeClearance} r={node.radius + 11} />
                  <circle r={node.radius} />
                  <text textAnchor="middle">{lines(node.questionText, center ? 18 : 13, center ? 3 : 2).map((line, index, all) => <tspan x="0" dy={index === 0 ? `${-(all.length - 1) * 0.55}em` : "1.1em"} key={`${line}-${index}`}>{line}</tspan>)}</text>
                </g>
              </a>;
            })}
          </g>
        </svg></div>
        {selected && <aside className={styles.preview}>
          <span>{selected.slug === graph.centerSlug ? "You are here" : `Selected · ${selected.status.replaceAll("_", " ")}`}</span>
          <strong>{selected.questionText}</strong>
          <p>{selected.category}</p>
          {selectedPath.length > 0 && <div className={styles.pathExplanation}><small>Path from the current question</small>{selectedPath.map((step, index) => <div key={`${step.to}-${index}`}><b>{relationshipPhrase(step.edge, step.from)} →</b><span>{positions.get(step.to)?.questionText}</span></div>)}</div>}
          <small>{selected.connectionCount} verified connection{selected.connectionCount === 1 ? "" : "s"}</small>
          <Link href={`/questions/${selected.slug}`}>{selected.slug === graph.centerSlug ? "Return to this question" : "Open question"} →</Link>
        </aside>}
      </div>
      <p className={styles.hint}>Choose any question circle to continue exploring · hover or focus to reveal its path · drag and zoom to move around.</p>
    </div>
  );
}
