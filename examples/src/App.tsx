import "./App.css"
import { CountMachine, countMachine } from "./machine"
import { useActorRef, useSelector } from "@xstate/react"
import { createMachineComponent } from "@webinargeek/machine-component"

const Count = createMachineComponent<CountMachine>({
  states: {
    a: {
      Component: ({ actorRef }) => {
        const count = useSelector(actorRef, (state) => state.context.count)

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
        )
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
})

function App() {
  const countActor = useActorRef(countMachine)
  return (
    <>
      <h1>Vite + React</h1>
      <Count actorRef={countActor} />
    </>
  )
}

export default App
