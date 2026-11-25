import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Badge } from "@/components/ui/badge"

afterEach(cleanup)

describe("Badge", () => {
  it("applique la variante accent", () => {
    render(<Badge variant="accent">Client</Badge>)

    const badge = screen.getByText("Client")
    expect(badge.getAttribute("data-variant")).toBe("accent")
    expect(badge.className).toContain("bg-accent")
    expect(badge.className).toContain("text-accent-foreground")
    expect(badge.className).not.toContain("bg-primary")
  })
})
