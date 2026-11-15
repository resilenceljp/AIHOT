// Undated topics cannot hide fresh reports, and switching order must not mutate the cached response.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicSummary } from "@aihot/contracts/site";
import { orderTopics, topicSort } from "../app/lib/topic-order.ts";

const groups = [{ key: "field" }, { key: "company" }];
const topic = (slug: string, at: string | null, recent: number, total: number, group: "field" | "company" = "field"): TopicSummary => ({
  slug, name: slug, group, recent, total, definition: slug, brand: null, indexable: true,
  latest: at ? { title: slug, at } : null,
});
const topics = [
  topic("B", null, 0, 40),
  topic("C", "2026-11-12T16:00:00Z", 2, 10, "company"),
  topic("A", "2026-11-13T08:00:00Z", 1, 20),
  topic("D", "invalid", 0, 0),
];
const slugs = (sort: Parameters<typeof orderTopics>[1]) => orderTopics(topics, sort, groups).map((t) => t.slug);

test("default order follows report time across groups, with undated topics last", () => {
  assert.equal(topicSort(null), "updated");
  assert.equal(topicSort("unexpected"), "updated");
  assert.deepEqual(slugs("updated"), ["A", "C", "B", "D"]);
  assert.deepEqual(topics.map((t) => t.slug), ["B", "C", "A", "D"]);
});

test("activity, total, name and group orders answer different browsing needs", () => {
  assert.deepEqual(slugs("recent"), ["C", "A", "B", "D"]);
  assert.deepEqual(slugs("total"), ["B", "A", "C", "D"]);
  assert.deepEqual(slugs("name"), ["A", "B", "C", "D"]);
  assert.deepEqual(slugs("group"), ["A", "B", "D", "C"]);
});
