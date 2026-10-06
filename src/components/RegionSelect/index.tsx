"use client";
import { useEffect, useState } from "react";
import { Select } from "@douyinfe/semi-ui-19";
import { requestJson } from "@/src/lib/http/request";
interface RegionNode {
  code: string;
  name: string;
  nameEn?: string | null;
  level: "province" | "city" | "district";
  children: RegionNode[];
}
function findPath(nodes: RegionNode[], code: string): RegionNode[] {
  for (const node of nodes) {
    if (node.code === code) return [node];
    const path = findPath(node.children, code);
    if (path.length) return [node, ...path];
  }
  return [];
}
export function RegionSelect({
  cityCode,
  adcode,
  cityName,
  locale,
  onChange,
}: {
  cityCode: string;
  adcode: string;
  cityName: string;
  locale: "zh" | "en";
  onChange: (r: { cityCode: string; adcode: string; cityName: string }) => void;
}) {
  const [nodes, setNodes] = useState<RegionNode[]>([]);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [provinceCode, setProvinceCode] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    requestJson<{ items: RegionNode[] }>("/api/regions", {
      signal: abort.signal,
    })
      .then((r) => setNodes(r.items))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [retry]);
  const path = findPath(nodes, adcode || cityCode);
  const province = nodes.find(
    (n) => n.code === (path[0]?.code || provinceCode),
  );
  const city = province?.children.find((n) => n.code === cityCode);
  const en = locale === "en";
  const names = en
    ? ["Province", "City", "District"]
    : ["省份", "城市", "区县"];
  const lists = [nodes, province?.children || [], city?.children || []];
  const values = [
    province?.code,
    city?.code,
    path.find((n) => n.level === "district")?.code,
  ];
  function change(index: number, value: string) {
    if (index === 0) {
      setProvinceCode(value);
      onChange({ cityCode: "", cityName: "", adcode: "" });
    }
    if (index === 1) {
      const next = province?.children.find((n) => n.code === value);
      onChange({
        cityCode: next?.code || "",
        cityName: next?.name || "",
        adcode: "",
      });
    }
    if (index === 2)
      onChange({ cityCode, cityName: city?.name || "", adcode: value });
  }
  return (
    <div className="min-w-0">
      <p className="mb-2 text-sm font-medium">
        {en ? "Location (optional)" : "所在地区（选填）"}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {lists.map((list, i) => (
          <Select
            key={i}
            id={`region-${i}`}
            aria-label={names[i]}
            value={values[i]}
            disabled={!list.length}
            filter
            showClear
            style={{ width: "100%" }}
            placeholder={
              i === 2 && city && !list.length
                ? en
                  ? "No district"
                  : "无需选择区县"
                : names[i]
            }
            optionList={list.map((n) => ({
              value: n.code,
              label: en ? n.nameEn || n.name : n.name,
            }))}
            onChange={(v) => change(i, typeof v === "string" ? v : "")}
          />
        ))}
      </div>
      {!path.length && cityName && (
        <p className="mt-2 text-sm">
          {en ? "Previous location: " : "原地区："}
          {cityName}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--error)]">
          {en ? "Could not load locations. " : "地区加载失败，"}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setError(false);
              setRetry((n) => n + 1);
            }}
          >
            {en ? "Retry" : "重试"}
          </button>
        </p>
      )}
    </div>
  );
}
