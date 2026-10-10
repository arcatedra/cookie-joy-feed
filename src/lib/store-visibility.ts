import { useQuery } from "@tanstack/react-query";
import { listPublicStores } from "./store-public.functions";
export function useStoresVisible() {
  const { data } = useQuery({ queryKey: ["public-stores", "navigation"], queryFn: () => listPublicStores(), staleTime: 30_000, refetchInterval: 60_000 });
  return (data?.length ?? 0) > 0;
}