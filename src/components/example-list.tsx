import type { Example } from "@/services/example-service"

type ExampleListProps = {
  examples: Example[]
}

export function ExampleList({ examples }: ExampleListProps) {
  if (examples.length === 0) {
    return <p>Aucun exemple.</p>
  }

  return (
    <ul>
      {examples.map((example) => (
        <li key={example.id}>{example.label}</li>
      ))}
    </ul>
  )
}
