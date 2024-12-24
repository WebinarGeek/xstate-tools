import { beforeEach, describe, expect, test } from "vitest"
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
          NEXT: "d",
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

  test("Can use the states field to render components", () => {
    const C = () => <div>C</div>
    const TestComponent = createMachineComponent<TestMachine>({
      states: {
        a: () => <div>A</div>,
        b: () => <div>B</div>,
        c: C,
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
    expect(screen.queryByText("C")).toBeNull()

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("A")
  })

  test("Will forward all props to the components", () => {
    const TestComponent = createMachineComponent<TestMachine, { foo: "bar" }>({
      states: {
        a: ({ foo, children }) => (
          <div>
            A {foo} {children}
          </div>
        ),
        b: ({ foo, children }) => (
          <div>
            B {foo} {children}
          </div>
        ),
      },
    })
    render(
      <TestComponent actorRef={actorRef} foo="bar">
        Child
      </TestComponent>,
    )

    screen.getByText("A bar Child")
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("B bar Child")
  })

  test("Will not umount components that are the same", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <div>Count is:{count}</div>
          <button onClick={() => setCount(count + 1)}>Click</button>
        </div>
      )
    }
    const TestComponent = createMachineComponent<TestMachine>({
      states: {
        a: Counter,
        b: Counter,
        c: () => <Counter />,
        d: () => <Counter />,
      },
    })

    const { click } = userEvent.setup()
    render(<TestComponent actorRef={actorRef} />)

    screen.getByText("Count is:0")
    await click(screen.getByRole("button"))
    screen.getByText("Count is:1")

    // Component will be the same between states a and b
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("Count is:1")

    // Using an anonymous function will create a new component and not be preserved
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("Count is:0")
    await click(screen.getByRole("button"))
    screen.getByText("Count is:1")
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("Count is:0")
  })

  test("Can use the Fallback field to render components", () => {
    const TestComponent = createMachineComponent<TestMachine, { foo: "bar" }>({
      Fallback: ({ foo }) => <div>Fallback {foo}</div>,
      states: {
        a: () => <div>A</div>,
        c: () => null,
      },
    })

    render(<TestComponent actorRef={actorRef} foo="bar" />)
    screen.getByText("A")
    expect(screen.queryByText("Fallback bar")).toBeNull()

    // Fallbacks are rendered when a state is not given
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("Fallback bar")

    // Fallbacks are not rendered when a state component is null
    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    expect(screen.queryByText("Fallback bar")).toBeNull()
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
          Layout: ({ children }) => {
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

  test("Fallbacks in nested states", () => {
    const TestComponent = createMachineComponent<TestMachine>({
      Fallback: () => <div>Root Fallback</div>,
      states: {
        a: {
          Fallback: () => <>Child Fallback</>,
          Layout: ({ children }) => {
            return <div>A {children}</div>
          },
          states: {
            b: () => <>B</>,
          },
        },
      },
    })

    render(<TestComponent actorRef={actorRef} />)

    screen.getByText("A B")
    act(() => {
      actorRef.send({ type: "innerNext" })
    })
    screen.getByText("A Child Fallback")
    act(() => {
      actorRef.send({ type: "innerNext" })
    })
    screen.getByText("A B")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("Root Fallback")

    act(() => {
      actorRef.send({ type: "NEXT" })
    })
    screen.getByText("A B")
  })
})
