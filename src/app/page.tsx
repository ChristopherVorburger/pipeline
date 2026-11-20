import { ExampleList } from "@/components/example-list";
import { ModeToggle } from "@/components/mode-toggle";
import { listExamples } from "@/services/example-service";

export default async function Home() {
  const examples = await listExamples();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl">Pipeline</h1>
        <ModeToggle />
      </header>
      <ExampleList examples={examples} />
    </main>
  );
}
