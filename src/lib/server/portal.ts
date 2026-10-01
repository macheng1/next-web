import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cache } from "react";
import { backendRequest } from "./backend";
export const fetchTenantData = cache(async (domain: string): Promise<any> => {
  try {
    const data = await backendRequest("portal", `/portal/${domain}/init`);

    // 💡 核心优化：将后端配置转换为前端组件需要的格式
    return data;
  } catch {
    // 生产环境建议使用 Sentry 等错误追踪服务
    console.error("Failed to fetch tenant data");
  }
});

/**
 * 💡 改造 2：根据 ID 获取产品详情
 */
export const fetchProductById = cache(
  async (domain: string, id: string): Promise<any> => {
    try {
      const product = await backendRequest<any>(
        "portal",
        `/portal/${domain}/products/${id}`,
      );

      if (product) {
        // 统一字段处理，提环
        const formattedSpecs = product.specs
          ? Object.entries(product.specs).map(([label, value]) => ({
              label,
              value,
            }))
          : [];

        return {
          id: product.id,
          name: product.name || product.title,
          desc: product.desc || product.description,
          cover: product.cover || (product.images && product.images[0]) || "",
          images: product.images || [],
          specs: formattedSpecs,
          price: product.price,
          unit: product.unit,
          category: product.category,
          brand: product.brand,
          tags: product.tags || [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          // ...如有其他字段可补充
        };
      }
    } catch {
      console.error("Failed to fetch product");
    }
    return null;
  },
);
