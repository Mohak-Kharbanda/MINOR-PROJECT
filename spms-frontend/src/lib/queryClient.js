import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
    },
  },
});
