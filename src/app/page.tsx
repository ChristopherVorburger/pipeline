import { ExampleList } from "@/components/example-list";
import { listExamples } from "@/services/example-service";

export default async function Home() {
  const examples = await listExamples();

  return (
    <main>
      <ExampleList examples={examples} />
    </main>
  );
}
