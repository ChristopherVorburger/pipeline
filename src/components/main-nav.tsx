import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

const LINKS = [
  { key: "contacts", href: "/", label: "Contacts" },
  { key: "followUp", href: "/a-relancer", label: "À relancer" },
  { key: "catalog", href: "/catalogue", label: "Catalogue" },
] as const

type MainNavProps = {
  current: (typeof LINKS)[number]["key"]
}

export function MainNav({ current }: MainNavProps) {
  return (
    <nav aria-label="Navigation principale" className="flex gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === current ? "page" : undefined}
          className={buttonVariants({ variant: link.key === current ? "secondary" : "ghost", size: "sm" })}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
