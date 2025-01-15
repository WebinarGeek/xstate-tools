# Machine Component

## Installation

```bash
npm install @webinar-geek/machine-component
```

## Motivation

When creating a react component which uses a state machine for conditional rendering based on it's states, you will have a series of if statements that for each state telling react what to render

```tsx
const Component = ({ actorRef }) => {
  const state = useSelector(actorRef, (state) => state.value)

  if (state === "a") {
    return <div>A</div>
  } else if (state === "b") {
    return <div>B</div>
  } else if (state === "c") {
    return <div>C</div>
  }

  return <div>Default</div>
}
```

By using a `createMachineComponent` helper, you can do this in a more declarative way

```tsx
import { createMachineComponent } from "@webinargeek/machine-component"

const Component = createMachineComponent<MyMachine>({
  states: {
    a: () => <div>A</div>,
    b: () => <div>B</div>,
    c: () => <div>C</div>,
  },
})
```

## Usage

The `createMachineComponent` function takes a config object which mirrors the states of an xstate machine and assigns a component to any of them. This component will be rendered when an actor whose config is that machine is passed to it via props

```tsx
import { createMachine } from "xstate"
import { useActorRef } from "@xstate/react"
import { createMachineComponent } from "@webinargeek/machine-component"

const myMachine = createMachine({
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

type MyMachine = typeof machine

const Component = createMachineComponent<MyMachine>({
  states: {
    a: () => <div>A</div>,
    b: () => <div>B</div>,
    c: () => <div>C</div>,
  },
})

const App = () => {
  const actorRef = useActorRef(myMachine)
  return <Component actorRef={actorRef} />
}
```

### Layout components

A Component can be passed to the `Component` field of a parent state which will be rendered without being unmounted as the child states change.

The components defined in the child states will be passed into the `children` prop.

```tsx
const Component = createMachineComponent<MyMachine>({
  states: {
    a: {
      Component: () => <div>A {children}</div>,
      states: {
        b: () => <div>B</div>,
        c: () => <div>C</div>,
      },
    },
    d: () => <div>D</div>,
  },
})
```

### Prop forwarding

The second generic parameter of the `createMachineComponent` function is a props object which will be forwarded to all state components.

The state components will also receive the `actorRef` prop that was passed to the machine component.

```tsx
const Component = createMachineComponent<MyMachine, { foo: string }>({
  states: {
    a: {
      Component: ({ foo }) => <div>A {foo}</div>,
    },
    b: ({ foo }) => <div>B {foo}</div>,
    c: ({ children, actorRef }) => {
      const context = useSelector(actorRef, (state) => state.context)
      return <div>C {children}</div>
    },
  },
})

const App = ({ children }) => {
  const actorRef = useActor(myMachine)
  return (
    <Component actorRef={actorRef} foo="bar">
      {children}
    </Component>
  )
}
```

### Parallel states

TODO....
