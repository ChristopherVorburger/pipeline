import {
  exampleRepository,
  type Example,
  type ExampleRepository,
} from "@/data/example-repository"

export type { Example }

export function listExamples(
  repository: ExampleRepository = exampleRepository,
): Promise<Example[]> {
  return repository.findAll()
}
