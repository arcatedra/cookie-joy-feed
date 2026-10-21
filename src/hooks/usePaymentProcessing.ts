import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { quotePaymentProcessing } from "@/lib/payment-processing.functions";

export function usePaymentProcessing(baseCents: number, enabled = true) {
  const quote = useServerFn(quotePaymentProcessing);
  const query = useQuery({
    queryKey: ["payment-processing", baseCents],
    queryFn: () => quote({ data: { baseCents } }),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
  return {
    ...query,
    ready: enabled && query.data?.baseCents === baseCents && !query.isError,
  };
}