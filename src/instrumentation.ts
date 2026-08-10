import type { Instrumentation } from "next"

/**
 * Error monitoring minimal (Fase 7). Next.js memanggil onRequestError untuk
 * setiap error tak tertangani pada request server (route handler, server
 * component, server action) -- ini setara dasar dari yang disediakan Sentry
 * SDK, tanpa perlu akun/DSN pihak ketiga. Kalau nanti tim punya akun Sentry
 * sendiri, fungsi ini tinggal diisi untuk juga mengirim ke sana.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logger } = await import("@/lib/logger")
  logger.error("Unhandled request error", error, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  })
}
