// src/components/portal/molecules/JobItem.tsx
import { Button, Typography } from "@douyinfe/semi-ui-19";
import { IconPhone } from "@douyinfe/semi-icons";

export const JobItem = ({ job, dict }: { job: {position:string;salary?:string|null;count?:number}; dict: {count:string;applyBtn:string} }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
    <div className="mb-4 md:mb-0">
      <Typography.Title heading={5} className="text-slate-900">
        {job.position}
      </Typography.Title>
      <div className="flex gap-4 mt-2">
        <span className="text-blue-600 font-bold">{job.salary}</span>
        <span className="text-gray-400">|</span>
        {/* 使用字典里的翻译字段 */}
        <span className="text-gray-500">
          {dict.count}: {job.count}
        </span>
      </div>
    </div>
    <Button
      icon={<IconPhone />}
      theme="solid"
      className="w-full md:w-auto bg-blue-600"
    >
      {dict.applyBtn}
    </Button>
  </div>
);
