import { beforeEach, describe, test } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createMachineComponent } from "./index"
import { createActor, createMachine } from "xstate"
import { useState } from "react"

describe("Basic machine", () => {
  const testMachine = createMachine({
    initial: "a",
    states: {
      a: {
        on: {
          NEXT: "b",
        },
      },
      b: {
        on: {
          NEXT: "c",
        },
      },
      c: {
        on: {
          NEXT: "a",
        },
      },
    },
  })

  type TestMachine = typeof testMachine

  let actorRef = createActor(testMachine)

  beforeEach(() => {
    actorRef = createActor(testMachine)
    actorRef.start()
  })
  test("Can use the component field to render components", async () => {
    const TestComponent = createMachineComponent<TestMachine>({
      states: {
        a: {
          Component: () => <div>A</div>,
        },
        b: {
          Component: () => <div>B</div>,
        },
        c: {
          Component: () => <div>C</div>,
        },
      },
    })

    render(<TestComponent actorRef={actorRef} />)
    screen.getByText("A")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("B")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("C")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("A")
  })

  test("Can use the states field to render components", async () => {
    const TestComponent = createMachineComponent<TestMachine>({
      states: {
        a: () => <div>A</div>,
        b: () => <div>B</div>,
        c: () => <div>C</div>,
      },
    })

    const screen = render(<TestComponent actorRef={actorRef} />)
    screen.getByText("A")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("B")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("C")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("A")
  })

  test("Will forward all props to the components", () => {
    const TestComponent = createMachineComponent<TestMachine, { foo: "bar" }>({
      states: {
        a: {
          Component: ({ foo }) => <div>A {foo}</div>,
        },
        b: ({ foo }) => <div>B {foo}</div>,
      },
    })
    const screen = render(<TestComponent actorRef={actorRef} foo="bar" />)
    screen.getByText("A bar")
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("B bar")
  })
})

describe("Nested machine", () => {
  const testMachine = createMachine({
    initial: "a",
    states: {
      a: {
        on: {
          NEXT: "d",
        },
        initial: "b",
        states: {
          b: {
            on: {
              innerNext: "c",
            },
          },
          c: {
            on: {
              innerNext: "b",
            },
          },
        },
      },
      d: {
        on: {
          NEXT: "a",
        },
      },
    },
  })

  type TestMachine = typeof testMachine

  let actorRef = createActor(testMachine)

  beforeEach(() => {
    actorRef = createActor(testMachine)
    actorRef.start()
  })
  test("Nested states", async () => {
    const TestComponent = createMachineComponent<TestMachine>({
      states: {
        a: {
          Component: ({ children }) => {
            const [count, setCount] = useState(0)
            return (
              <div>
                <div>A {children}</div>
                <button onClick={() => setCount(count + 1)}>Click</button>
                <div>Count is:{count}</div>
              </div>
            )
          },
          states: {
            b: () => <>B</>,
            c: () => <>C</>,
          },
        },
        d: () => <div>D</div>,
      },
    })

    const { click } = userEvent.setup()
    render(<TestComponent actorRef={actorRef} />)

    screen.getByText("A B")
    const countButton = screen.getByText("Click")
    act(() => {
      actorRef.send({ type: "innerNext" })
    })
    screen.getByText("Count is:0")
    await click(countButton)
    screen.getByText("Count is:1")
    screen.getByText("A C")
    await click(countButton)
    screen.getByText("Count is:2")

    act(() => {
      actorRef.send({ type: "innerNext" })
    })
    screen.getByText("A B")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("D")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("A B")
    screen.getByText("Count is:0")
  })
})
