-- Inspect mod counts per tag
SELECT tag, COUNT(*) AS mod_count
FROM read_json_auto('data/latest/Mod.jsonl')
CROSS JOIN UNNEST(tags) AS t(tag)
GROUP BY tag
ORDER BY mod_count DESC
LIMIT 25;

-- Unique base items per item class
SELECT itemClass, COUNT(DISTINCT id) AS bases
FROM read_json_auto('data/latest/BaseItem.jsonl')
GROUP BY itemClass
ORDER BY bases DESC;

-- Typical cost ranges for craft actions
SELECT type, AVG(typicalCostChaos) AS avg_cost_chaos, COUNT(*) AS crafts
FROM read_json_auto('data/latest/CraftAction.jsonl')
GROUP BY type
ORDER BY avg_cost_chaos DESC;
