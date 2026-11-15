import type { TopicSummary } from "@aihot/contracts/site";

export const TOPIC_SORTS = [
  { value: "updated", label: "资讯更新时间" },
  { value: "recent", label: "近30天活跃" },
  { value: "total", label: "累计资讯数量" },
  { value: "name", label: "主题名称" },
  { value: "group", label: "分类顺序" },
] as const;
export type TopicSort = typeof TOPIC_SORTS[number]["value"];

export function topicSort(value: string | null): TopicSort {
  return TOPIC_SORTS.find((s) => s.value === value)?.value ?? "updated";
}

/** Sort the shared response without changing it; missing or invalid dates follow dated reports. */
export function orderTopics(topics: readonly TopicSummary[], sort: TopicSort, groups: readonly { key: string }[]): TopicSummary[] {
  const at = (t: TopicSummary) => {
    const parsed = t.latest ? Date.parse(t.latest.at) : NaN;
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  const names = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
  return [...topics].sort((a, b) => {
    if (sort === "name") return names.compare(a.name, b.name) || a.slug.localeCompare(b.slug);
    if (sort === "group") {
      const position = (t: TopicSummary) => {
        const index = groups.findIndex((g) => g.key === t.group);
        return index < 0 ? groups.length : index;
      };
      const group = position(a) - position(b);
      if (group) return group;
    }
    if (sort === "recent" && a.recent !== b.recent) return b.recent - a.recent;
    if (sort === "total" && a.total !== b.total) return b.total - a.total;
    const left = at(a), right = at(b);
    if (left !== right) return left > right ? -1 : 1;
    return names.compare(a.name, b.name) || a.slug.localeCompare(b.slug);
  });
}
