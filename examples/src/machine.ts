import { assign, setup } from "xstate"

export const countMachine = setup({
  types: {
    context: {} as { count: number },
  },
}).createMachine({
  context: {
    count: 0,
  },
  initial: "a",
  states: {
    a: {
      on: {
        count: {
          actions: assign({
            count: ({ context }) => context.count + 1,
          }),
        },
        stop: {
          target: "b",
        },
      },
    },
    b: {
      on: {
        start: {
          target: "a",
        },
      },
    },
  },
})

export type CountMachine = typeof countMachine
