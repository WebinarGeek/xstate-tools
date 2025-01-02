import { useSelector } from "@xstate/react"
import { ComponentType, ReactNode } from "react"
import {
  AnyStateMachine,
  StateValueFrom,
  ActorRefFrom,
  StateValueMap,
} from "xstate"

interface ChildrenProp {
  children?: ReactNode
}

/**
 * Empty component that will pass through children
 */
export const ChildComponent = ({ children }: ChildrenProp) => children

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
      Layout?: ComponentType<MachineComponentProps<TMachine, Props>>
      Fallback?: ComponentType<MachineComponentProps<TMachine, Props>>
      states: [CurrentStateValue] extends [never]
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

// A generic machine component config that is easier to use in the
// createMachineComponent function
type GenericMachineComponentConfig =
  | {
      Layout?: ComponentType<MachineComponentProps>
      Fallback?: ComponentType<MachineComponentProps>
      states: Record<string, GenericMachineComponentConfig>
    }
  | ComponentType<MachineComponentProps>

/**
 * A component that renders a nested chain of components at a given state value
 * in a machine
 *
 * @example
 *
 * const MyMachineComponent = createMachineComponent<MyMachine>({
 *   states: {
 *     a: () => <div>A</div>,
 *     b: {
 *       Layout: ({ children }) => <div>B {children}</div>,
 *       Fallback: () => <div>Fallback</div>,
 *       states: {
 *         c: () => <div>C</div>,
 *         d: () => null,
 *       },
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
 * While the state value is { b: 'e' } the component will render <div>B Fallback</div>
 * While the state value is 'f' the component will render null
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
    // If the current config is a function then render it
    if (typeof currentConfig === "function") {
      const Component = currentConfig
      return (
        <Component actorRef={actorRef} {...props}>
          {children}
        </Component>
      )
    }
    // This means we are in a leaf node and we should use a function component
    // to render something
    if (!currentStateValue) return null

    const { states, Layout, Fallback } = currentConfig

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

    // Will either be the recursive return of the next state config or the
    // Fallback if that exists
    const child = nextConfig ? (
      // @ts-expect-error Generic props are not typed safely
      <MachineComponentAtStateValue
        actorRef={actorRef}
        currentConfig={nextConfig}
        currentStateValue={nextStateValue}
        {...props}
      >
        {children}
      </MachineComponentAtStateValue>
    ) : (
      Fallback && (
        <Fallback actorRef={actorRef} {...props}>
          {children}
        </Fallback>
      )
    )

    // If there is a Layout, then wrap the child with it
    if (Layout)
      return (
        <Layout actorRef={actorRef} {...props}>
          {child}
        </Layout>
      )
    return child
  }

  const RenderWithStateValue = ({
    actorRef,
    children,
    ...props
  }: ChildrenProp & { actorRef: ActorRefFrom<AnyStateMachine> } & Props) => {
    const stateValue = useSelector(actorRef, (s) => s.value as StateValueMap)
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
