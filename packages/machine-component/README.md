# Machine Component

## Installation

```bash
npm install @webinargeek/machine-component
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

````tsx
import { createMachineComponent } from "@webinargeek/machine-component";

const Component = createMachineComponent<MyMachine>({
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
});

## Full Example

```tsx
import { createMachineComponent } from "@webinargeek/machine-component";

const Count = createMachineComponent<CountMachine>({
  states: {
    a: {
      Component: ({ actorRef }) => {
        const count = useSelector(actorRef, (state) => state.context.count);

        return (
          <>
            <div className="card">
              <button onClick={() => actorRef.send({ type: "count" })}>
                count is {count}
              </button>
            </div>
            <div className="card">
              <button onClick={() => actorRef.send({ type: "stop" })}>
                Stop
              </button>
            </div>
          </>
        );
      },
    },
    b: {
      Component: ({ actorRef }) => (
        <div className="card">
          <button onClick={() => actorRef.send({ type: "start" })}>
            Start
          </button>
        </div>
      ),
    },
  },
});
````
