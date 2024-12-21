import { useSelector } from "@xstate/react"
import { ComponentType, ReactNode } from "react"
import { AnyStateMachine, StateValueFrom, ActorRefFrom } from "xstate"

interface ChildrenProp {
  children?: ReactNode
}

// Props for a nested Component inside a MachineComponent
export type MachineComponentProps<
  TMachine extends AnyStateMachine = AnyStateMachine,
> = {
  actorRef: ActorRefFrom<TMachine>
} & ChildrenProp

// Extracts the nested state value from a root machine state
// eg. NestedStateValue<'a' | 'd' | { a: 'b' } | { a: { b: 'c' }} | { d: 'e' }, 'a'> => { b: 'c' }
type NestedStateValue<
  TStateValue,
  TStateKey extends Extract<TStateValue, string>,
> = Extract<TStateValue, Partial<Record<TStateKey, unknown>>>[TStateKey]

// Config for a machine component. Iterates through the machines states providing a component at every level
interface MachineComponentConfig<
  TMachine extends AnyStateMachine,
  CurrentStateValue = StateValueFrom<TMachine>,
> {
  Component?: ComponentType<MachineComponentProps<TMachine>>
  states?: [CurrentStateValue] extends [never]
    ? never
    : {
        [StateValue in Extract<
          CurrentStateValue,
          string
        >]?: MachineComponentConfig<
          TMachine,
          Exclude<NestedStateValue<CurrentStateValue, StateValue>, undefined>
        >
      }
}

// A generic machine component config that is easier to use in the createMachineComponent function
interface GenericMachineComponentConfig {
  Component?: ComponentType<MachineComponentProps>
  states?: Record<string, GenericMachineComponentConfig>
}

/**
 * A component that renders a nested chain of components at a given state value in a machine
 *
 * @example
 *
 * const MyMachineComponent = createMachineComponent<MyMachine>({
 *   states: {
 *     a: {
 *       Component: () => <div>A</div>,
 *     },
 *     b: {
 *       Component: ({ children }) => <div>B {children}</div>,
 *       states: {
 *         c: {
 *           Component: () => <div>C</div>,
 *         },
 *         d: {}
 *       }
 *     },
 *   }
 * })
 *
 * While the state value is 'a' the component will render <div>A</div>
 * While the state value is { b: 'c' } the component will render <div>B C</div>
 * While the state value is { b: 'd' } the component will render <div>B </div>
 */
export const createMachineComponent = <TMachine extends AnyStateMachine>(
  config: MachineComponentConfig<TMachine>,
) => {
  const MachineComponentAtStateValue = ({
    actorRef,
    children,
    currentConfig = config as GenericMachineComponentConfig,
    currentStateValue,
  }: {
    actorRef: ActorRefFrom<AnyStateMachine>
    currentConfig?: GenericMachineComponentConfig
    // Can't make a recursive type for this but is enough to ge this deep
    currentStateValue: string | Record<string, string> | null
  } & ChildrenProp) => {
    const { states, Component } = currentConfig

    if (currentStateValue) {
      // IDEA: Handle parallel states and using named slots in the wrapper
      const currentStateValueKey =
        typeof currentStateValue === "string"
          ? currentStateValue
          : Object.keys(currentStateValue)[0]
      const nextConfig = states?.[currentStateValueKey]
      const nextStateValue =
        typeof currentStateValue === "string"
          ? null
          : currentStateValue[currentStateValueKey]

      if (nextConfig) {
        if (Component)
          return (
            <Component actorRef={actorRef}>
              <MachineComponentAtStateValue
                actorRef={actorRef}
                currentConfig={nextConfig}
                currentStateValue={nextStateValue}
              >
                {children}
              </MachineComponentAtStateValue>
            </Component>
          )

        return (
          <MachineComponentAtStateValue
            actorRef={actorRef}
            currentConfig={nextConfig}
            currentStateValue={nextStateValue}
          >
            {children}
          </MachineComponentAtStateValue>
        )
      }
    }

    if (Component) return <Component actorRef={actorRef}>{children}</Component>

    return null
  }

  const RenderWithStateValue = ({
    actorRef,
    children,
  }: ChildrenProp & { actorRef: ActorRefFrom<AnyStateMachine> }) => {
    const stateValue = useSelector(actorRef, (s) => s.value)
    return (
      <MachineComponentAtStateValue
        actorRef={actorRef}
        currentStateValue={stateValue}
      >
        {children}
      </MachineComponentAtStateValue>
    )
  }

  return RenderWithStateValue
}
