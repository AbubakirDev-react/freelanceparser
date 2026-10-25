// Единый формат заказа: каждый источник приводит свои данные к нему.
export type Order = {
  source: string;
  externalId: string;
  title: string;
  description: string;
  budget: number | null; // в рублях; null — «договорная» или не указан
  url: string;
  publishedAt: Date;
};

export interface OrderSource {
  name: string;
  fetchNew(): Promise<Order[]>;
}
