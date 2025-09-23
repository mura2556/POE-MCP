import { z } from "zod";

export const PobBuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  characterClass: z.string().default("Unknown"),
  mainSkill: z.string().default("Unknown"),
  dps: z.number().nonnegative().default(0),
  poeVersion: z.string().default("unknown"),
  items: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

export type PobBuild = z.infer<typeof PobBuildSchema>;

export const parsePobBuild = (input: unknown): PobBuild => {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      return PobBuildSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse PoB build string: ${(error as Error).message}`);
    }
  }

  return PobBuildSchema.parse(input);
};

export const loadDefaultBuilds = (): PobBuild[] => [
  {
    id: "starter-righteous-fire",
    name: "Starter Righteous Fire",
    characterClass: "Templar",
    mainSkill: "Righteous Fire",
    dps: 850000,
    poeVersion: "3.25",
    items: ["Divine Orb", "Chaos Orb", "Lifeforce"],
    tags: ["league-starter", "fire", "dot"]
  },
  {
    id: "essence-shotgun",
    name: "Essence Drain Trickster",
    characterClass: "Shadow",
    mainSkill: "Essence Drain",
    dps: 450000,
    poeVersion: "3.25",
    items: ["Divine Orb", "Exalted Orb"],
    tags: ["dot", "trickster"]
  }
];
