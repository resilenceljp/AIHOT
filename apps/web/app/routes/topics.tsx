import { useLoaderData, useSearchParams } from "react-router";
import { SITE, subjectAfter, withSubject } from "@aihot/site";
import type { Route } from "./+types/topics";
import type { TopicSummary, TopicsResponse } from "@aihot/contracts/site";
import { apiGet, cachedPage } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { breadcrumbLd, pageMeta, siteUrl } from "../lib/seo";
import { relativeTime } from "../lib/format";
import { orderTopics, topicSort, TOPIC_SORTS } from "../lib/topic-order";
import { IconChevronRight } from "../components/icons";
import { IntentLink } from "../components/ui/IntentLink";
import { BrandMark } from "../components/BrandMark";
import { PhoneBar } from "../components/shell/PhoneBar";
import { navUp } from "../components/shell/nav";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { home: navUp("/topics").tab, name: "主题" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>(() => "/topics");

export async function loader({ request }: { request: Request }) {
  return cachedPage(300, await apiGet<TopicsResponse>("/api/site/topics", { signal: request.signal }));
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return pageMeta({ title: SITE.topicsTitle, path: "/topics", image: "/og/pages/topics.png" });
  const { groups, topics } = loaderData;
  const by = groups.map((g) => g.name).join("、");
  const indexed = orderTopics(topics, "updated", groups).filter((t) => t.indexable);
  const named = indexed.slice(0, 6).map((t) => t.name.split(" / ")[0]).join("、");
  const base = siteUrl();
  return pageMeta({
    title: SITE.topicsTitle,
    description: `按${by}${subjectAfter("追踪", "最新动态")}：${named ? `${named}等 ` : ""}${topics.length} 个主题，浏览最新精选与重要进展，持续更新。`,
    path: "/topics",
    image: "/og/pages/topics.png",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${base}/topics#collection`,
        url: `${base}/topics`,
        name: withSubject("主题"),
        inLanguage: SITE.locale,
        isPartOf: { "@id": `${base}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: indexed.length,
          itemListElement: indexed.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: `${base}/topics/${t.slug}` })),
        },
      },
      breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "主题", path: "/topics" }]),
    ],
  });
}

/** A compact row, shared by both columns and the phone list. */
function TopicCard({ t, groupName }: { t: TopicSummary; groupName: string }) {
  return (
    <IntentLink
      viewTransition
      to={`/topics/${t.slug}`}
      className="group flex h-full items-start gap-3 px-4 py-4 transition-colors hover:bg-bg-sunk active:bg-bg-sunk"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-tile border border-line-soft bg-bg-sunk text-[14px] font-semibold text-accent">
        {t.brand ? <BrandMark brand={t.brand} size={30} /> : <span aria-hidden="true">{[...t.name][0]}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold leading-6 text-ink group-hover:text-accent">{t.name}</span>
          <span className="text-[11px] text-ink-4">{groupName}</span>
        </span>
        <span className="mt-1 line-clamp-2 min-h-[40px] text-[12.5px] leading-5 text-ink-3">
          {t.latest?.title ?? t.definition}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-4">
          {t.latest ? <time dateTime={t.latest.at} suppressHydrationWarning>{relativeTime(t.latest.at)}更新</time> : <span>暂无资讯</span>}
          <span>近30天 <span className="num text-ink-3">{t.recent}</span> 条</span>
          <span>累计 <span className="num">{t.total}</span> 条</span>
        </span>
      </span>
      <IconChevronRight size={15} className="mt-1 shrink-0 text-ink-4" />
    </IntentLink>
  );
}

export default function TopicsPage() {
  const { groups, topics } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const sort = topicSort(params.get("sort"));
  const group = groups.some((g) => g.key === params.get("group")) ? params.get("group")! : "all";
  const visible = orderTopics(topics.filter((t) => group === "all" || t.group === group), sort, groups);
  const change = (key: string, value: string, fallback: string) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value === fallback) next.delete(key); else next.set(key, value);
    return next;
  }, { replace: true, preventScrollReset: true });
  return (
    <div className="pb-10">
      <PhoneBar back={{ to: "/more", label: "我的" }} title="主题" />
      <header className="pb-2 pt-3 lg:pt-1">
        <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">主题关注</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
          <span className="num">{topics.length}</span> 个主题，把值得看的新资讯放在前面。
        </p>
      </header>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-line-soft pb-4">
        <label className="flex items-center gap-2 text-[12px] text-ink-3">
          分类
          <select aria-label="主题分类" value={group} onChange={(e) => change("group", e.target.value, "all")} className="min-w-0 rounded-control border border-line bg-surface px-3 py-2 text-[13px] text-ink focus-visible:outline-accent">
            <option value="all">全部主题</option>
            {groups.map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12px] text-ink-3">
          排列
          <select aria-label="主题排列方式" value={sort} onChange={(e) => change("sort", e.target.value, "updated")} className="min-w-0 rounded-control border border-line bg-surface px-3 py-2 text-[13px] text-ink focus-visible:outline-accent">
            {TOPIC_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <p role="status" className="py-3 text-[12px] text-ink-4">
        显示 {visible.length} 个主题 · {sort === "updated" ? "按最新精选资讯时间，从新到旧" : `按${TOPIC_SORTS.find((s) => s.value === sort)!.label}排列`}
      </p>
      <ul aria-label="关注主题列表" className="grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface md:grid-cols-2">
        {visible.map((t) => (
          <li key={t.slug} className="min-w-0 border-b border-line-soft last:border-b-0 md:odd:border-r">
            <TopicCard t={t} groupName={groups.find((g) => g.key === t.group)?.name ?? t.group} />
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="py-10 text-center text-[13px] text-ink-4">这个分类暂时没有主题。</p>}
    </div>
  );
}
