import { normalizeTag } from "./normalize.js";
import type { BaseItemDefinition, CraftingRule, CraftingRuleSet, ModDefinition } from "./types.js";

const ensureUnique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const normalizeRuleSet = (ruleSet: CraftingRuleSet): CraftingRuleSet => {
  const rules: Record<string, CraftingRule> = {};
  const byTag: Record<string, string[]> = {};

  for (const [id, rule] of Object.entries(ruleSet.rules)) {
    const normalizedTags = ensureUnique(rule.tags.map(normalizeTag));
    const normalizedRule: CraftingRule = {
      ...rule,
      id,
      tags: normalizedTags
    };
    rules[id] = normalizedRule;

    for (const tag of normalizedTags) {
      if (!byTag[tag]) {
        byTag[tag] = [];
      }
      byTag[tag].push(id);
    }
  }

  for (const [tag, ids] of Object.entries(byTag)) {
    byTag[tag] = ensureUnique(ids);
  }

  return { rules, byTag };
};

export interface RuleMatch {
  rule: CraftingRule;
  matchedTags: string[];
  score: number;
}

const calculateRuleScore = (rule: CraftingRule, tags: Set<string>): RuleMatch | null => {
  const matchedTags = rule.tags.filter((tag) => tags.has(tag));
  if (matchedTags.length === 0) {
    return null;
  }

  return {
    rule,
    matchedTags,
    score: matchedTags.length / rule.tags.length
  };
};

export const matchRulesForTags = (
  ruleSet: CraftingRuleSet,
  tags: Iterable<string>
): RuleMatch[] => {
  const normalizedSet = normalizeRuleSet(ruleSet);
  const targetTags = new Set(Array.from(tags, normalizeTag));
  const visited = new Set<string>();
  const matches: RuleMatch[] = [];

  for (const tag of targetTags) {
    const candidateIds = normalizedSet.byTag[tag] ?? [];
    for (const ruleId of candidateIds) {
      if (visited.has(ruleId)) {
        continue;
      }

      const match = calculateRuleScore(normalizedSet.rules[ruleId], targetTags);
      if (match) {
        matches.push(match);
        visited.add(ruleId);
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score || a.rule.title.localeCompare(b.rule.title));
};

export const matchRulesForCraft = (
  ruleSet: CraftingRuleSet,
  base: BaseItemDefinition,
  mods: ModDefinition[]
): RuleMatch[] => {
  const tags = new Set<string>();
  base.tags.forEach((tag) => tags.add(normalizeTag(tag)));
  for (const mod of mods) {
    mod.tags.forEach((tag) => tags.add(normalizeTag(tag)));
    mod.applicableTags.forEach((tag) => tags.add(normalizeTag(tag)));
  }

  return matchRulesForTags(ruleSet, tags);
};

export const mergeRuleSets = (ruleSets: CraftingRuleSet[]): CraftingRuleSet => {
  const merged: CraftingRuleSet = { rules: {}, byTag: {} };

  for (const ruleSet of ruleSets) {
    const normalized = normalizeRuleSet(ruleSet);
    for (const [id, rule] of Object.entries(normalized.rules)) {
      merged.rules[id] = rule;
    }
    for (const [tag, ids] of Object.entries(normalized.byTag)) {
      const existing = merged.byTag[tag] ?? [];
      merged.byTag[tag] = ensureUnique([...existing, ...ids]);
    }
  }

  return merged;
};
