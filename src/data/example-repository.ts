export type Example = {
  id: string
  label: string
}

export interface ExampleRepository {
  findAll(): Promise<Example[]>
}

export function createInMemoryExampleRepository(
  initial: Example[] = [],
): ExampleRepository {
  const examples = [...initial]

  return {
    async findAll() {
      return [...examples]
    },
  }
}

export const exampleRepository = createInMemoryExampleRepository()
