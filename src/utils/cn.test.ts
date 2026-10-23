import { cn, TYPE_SCALE } from "@/utils/cn";

describe("cn", () => {
  it("keeps a type-scale size together with a text colour", () => {
    expect(cn("text-caption text-ink-muted")).toBe("text-caption text-ink-muted");
  });

  it("keeps only the last of two type-scale sizes", () => {
    expect(cn("text-caption text-display")).toBe("text-display");
  });

  it.each(TYPE_SCALE)("treats text-%s as a font size that overrides text-sm", (name) => {
    expect(cn("text-sm text-ink", `text-${name}`)).toBe(`text-ink text-${name}`);
  });
});
