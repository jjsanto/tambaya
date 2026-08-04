import { describe, expect, it } from "vitest";
import { bayesianRating } from "./rating";
describe("rating", () => { it("tempers tiny samples toward the site mean", () => { expect(bayesianRating(5, 1)).toBeLessThan(4); expect(bayesianRating(5, 100)).toBeGreaterThan(4.8); }); });
