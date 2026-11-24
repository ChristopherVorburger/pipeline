import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { MainNav } from "@/components/main-nav"

afterEach(cleanup)

describe("MainNav", () => {
  it("relie la liste des contacts, la vue À relancer et le catalogue", () => {
    render(<MainNav current="contacts" />)

    expect(screen.getByRole("link", { name: "Contacts" }).getAttribute("href")).toBe("/")
    expect(screen.getByRole("link", { name: "À relancer" }).getAttribute("href")).toBe("/a-relancer")
    expect(screen.getByRole("link", { name: "Catalogue" }).getAttribute("href")).toBe("/catalogue")
  })

  it("signale la page courante", () => {
    render(<MainNav current="followUp" />)

    expect(screen.getByRole("link", { name: "À relancer" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Contacts" }).getAttribute("aria-current")).toBeNull()
  })
})
