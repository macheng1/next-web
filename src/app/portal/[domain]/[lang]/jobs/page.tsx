import { portalPageMetadata } from "@/src/lib/server/portal-metadata";
import { IconArrowRight, IconMapPin } from "@douyinfe/semi-icons";
import { fetchTenantData } from "@/src/lib/server/portal";
import { formatJobPublishTime } from "@/src/lib/formatJobPublishTime";

type PortalJob = {
  id: string;
  position: string;
  count?: number;
  salary?: string | null;
  location?: string | null;
  experience?: string | null;
  education?: string | null;
  description?: string | null;
  requirement?: string | null;
  createdAt?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  return portalPageMetadata(params, "jobs");
}

export default async function JobsPage({
  params,
}: {
  params: Promise<{ domain: string; lang: string }>;
}) {
  const { domain, lang } = await params;
  const data = await fetchTenantData(domain);

  if (!data) return <div className="p-20 text-center">未找到工厂信息</div>;

  return (
    <main className="min-h-screen bg-[#f4f6f8]">
      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-black tracking-[0.28em] text-blue-300">
            CAREERS
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl font-black">招聘职位</h1>
          <p className="mt-5 max-w-2xl leading-8 text-white/65">
            欢迎加入 {data.name}
            ，参与制造现场、质量管理和客户交付，让稳定产品服务更多工业客户。
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        {data.jobs?.length ? (
          <div className="space-y-5">
            {(data.jobs as PortalJob[]).map((job) => (
              <article
                key={job.id}
                className="border border-slate-200 bg-white p-5 md:p-7"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-950">
                        {job.position}
                      </h2>
                      {formatJobPublishTime(job.createdAt) && (
                        <span className="border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {formatJobPublishTime(job.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <IconMapPin /> {job.location || "工作地点面议"}
                      </span>
                      <span>/</span>
                      <span>招 {job.count || 1} 人</span>
                      {job.experience && (
                        <>
                          <span>/</span>
                          <span>{job.experience}</span>
                        </>
                      )}
                      {job.education && (
                        <>
                          <span>/</span>
                          <span>{job.education}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border-l-0 border-slate-200 lg:border-l lg:pl-6">
                    <div className="text-sm font-bold text-slate-500">
                      薪资范围
                    </div>
                    <div className="mt-2 text-2xl font-black text-blue-700">
                      {job.salary || "薪资面议"}
                    </div>
                    <a
                      href={`/portal/${domain}/${lang}/contact`}
                      className="mt-5 inline-flex items-center gap-2 bg-slate-950 px-5 py-2.5 text-sm font-bold text-white no-underline"
                    >
                      联系我们 <IconArrowRight />
                    </a>
                  </div>
                </div>

                {(job.description || job.requirement) && (
                  <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
                    {job.description && (
                      <section>
                        <h3 className="text-sm font-black text-slate-950">
                          职位描述
                        </h3>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                          {job.description}
                        </p>
                      </section>
                    )}
                    {job.requirement && (
                      <section>
                        <h3 className="text-sm font-black text-slate-950">
                          任职要求
                        </h3>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                          {job.requirement}
                        </p>
                      </section>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-slate-200 bg-white p-12 text-center text-slate-500">
            暂无招聘职位
          </div>
        )}
      </section>
    </main>
  );
}
