export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkStorage } = await import("@/services/contact-service")
    checkStorage()
  }
}
