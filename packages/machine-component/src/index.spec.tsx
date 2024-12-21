import { test } from "vitest";
import { act, render } from "@testing-library/react";
import { createMachineComponent } from "./index";
import { createActor, createMachine } from "xstate";

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
});

const actorRef = createActor(testMachine);
actorRef.start();

const TestComponent = createMachineComponent({
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

test("renders the correct component", async () => {
  const screen = render(<TestComponent actorRef={actorRef} />);
  screen.getByText("A");

  act(() => {
    actorRef.send({ type: "NEXT" });
  });
  screen.getByText("B");

  act(() => {
    actorRef.send({ type: "NEXT" });
  });
  screen.getByText("C");

  act(() => {
    actorRef.send({ type: "NEXT" });
  });
  screen.getByText("A");
});
