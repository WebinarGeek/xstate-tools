import { useSelector } from "@xstate/react"
import { ComponentType, ReactNode } from "react"
import { AnyStateMachine, StateValueFrom, ActorRefFrom } from "xstate"

interface ChildrenProp {
  children?: ReactNode
}

// Props for a nested Component inside a MachineComponent
export type MachineComponentProps<
  TMachine extends AnyStateMachine = AnyStateMachine,
  Props extends object = object,
> = {
  actorRef: ActorRefFrom<TMachine>
} & ChildrenProp &
  Props

// Extracts the nested state value from a root machine state
// eg. NestedStateValue<'a' | 'd' | { a: 'b' } | { a: { b: 'c' }} | { d: 'e' }, 'a'> => { b: 'c' }
type NestedStateValue<
  TStateValue,
  TStateKey extends Extract<TStateValue, string>,
> = Extract<TStateValue, Partial<Record<TStateKey, unknown>>>[TStateKey]

// Config for a machine component. Iterates through the machines states providing a component at every level
type MachineComponentConfig<
  TMachine extends AnyStateMachine,
  CurrentStateValue = StateValueFrom<TMachine>,
  Props extends object = object,
> =
  | {
      Component?: ComponentType<MachineComponentProps<TMachine, Props>>
      states?: [CurrentStateValue] extends [never]
        ? never
        : {
            [StateValue in Extract<
              CurrentStateValue,
              string
            >]?: MachineComponentConfig<
              TMachine,
              Exclude<
                NestedStateValue<CurrentStateValue, StateValue>,
                undefined
              >,
              Props
            >
          }
    }
  | ComponentType<MachineComponentProps<TMachine, Props>>

// A generic machine component config that is easier to use in the createMachineComponent function
type GenericMachineComponentConfig =
  | {
      Component?: ComponentType<MachineComponentProps>
      states?: Record<string, GenericMachineComponentConfig>
    }
  | ComponentType<MachineComponentProps>

/**
 * A component that renders a nested chain of components at a given state value in a machine
 *
 * @example
 *
 * const MyMachineComponent = createMachineComponent<MyMachine>({
 *   states: {
 *     a: () => <div>A</div>,
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
 * const App = () => {
 *   const actorRef = useActor(myMachine)
 *   return <MyMachineComponent actorRef={actorRef} />
 * }
 *
 * While the state value is 'a' the component will render <div>A</div>
 * While the state value is { b: 'c' } the component will render <div>B C</div>
 * While the state value is { b: 'd' } the component will render <div>B </div>
 */
export const createMachineComponent = <
  TMachine extends AnyStateMachine,
  Props extends object = object,
>(
  config: MachineComponentConfig<TMachine, StateValueFrom<TMachine>, Props>,
) => {
  const MachineComponentAtStateValue = ({
    actorRef,
    children,
    currentConfig = config as GenericMachineComponentConfig,
    currentStateValue,
    ...props
  }: {
    actorRef: ActorRefFrom<AnyStateMachine>
    currentConfig?: GenericMachineComponentConfig
    // Can't make a recursive type for this but is enough to ge this deep
    currentStateValue: string | Record<string, string> | null
  } & ChildrenProp &
    Props) => {
    // If the current config is a function then it is a component
    if (typeof currentConfig === "function") {
      const Component = currentConfig
      return (
        <Component actorRef={actorRef} {...props}>
          {children}
        </Component>
      )
    }

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
            <Component actorRef={actorRef} {...props}>
              {/* @ts-expect-error Generic props are not typed safely */}
              <MachineComponentAtStateValue
                actorRef={actorRef}
                currentConfig={nextConfig}
                currentStateValue={nextStateValue}
                {...props}
              >
                {children}
              </MachineComponentAtStateValue>
            </Component>
          )

        return (
          // @ts-expect-error Generic props are not typed safely
          <MachineComponentAtStateValue
            actorRef={actorRef}
            currentConfig={nextConfig}
            currentStateValue={nextStateValue}
            {...props}
          >
            {children}
          </MachineComponentAtStateValue>
        )
      }
    }

    if (Component)
      return (
        <Component actorRef={actorRef} {...props}>
          {children}
        </Component>
      )

    return null
  }

  const RenderWithStateValue = ({
    actorRef,
    children,
    ...props
  }: ChildrenProp & { actorRef: ActorRefFrom<AnyStateMachine> } & Props) => {
    const stateValue = useSelector(actorRef, (s) => s.value)
    return (
      // @ts-expect-error Generic props are not typed safely
      <MachineComponentAtStateValue
        actorRef={actorRef}
        currentStateValue={stateValue}
        {...props}
      >
        {children}
      </MachineComponentAtStateValue>
    )
  }

  return RenderWithStateValue
}
