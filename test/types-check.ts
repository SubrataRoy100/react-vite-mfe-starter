// Verify root imports and types
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  useMfeEventListener,
  UniversalRemoteMount,
  createMfeEventBus,
  Button,
} from "../packages/shared/src/index.js";

// Verify adapters imports and types
import {
  UniversalRemoteMount as URM,
  createReactMount,
  createVanillaMount,
  normalizeRemoteModule,
  useMfeEventListener as hookFromAdapters,
  type UniversalRemoteMountProps,
  type DualModeReactMount,
} from "../packages/shared/src/adapters/index.js";

// Verify events imports and types
import {
  MFE_EVENTS as eventsConst,
  sendMfeEvent as sendEvt,
  useMfeEventListener as hookFromEvents,
  createMfeEventBus as createEventsBus,
  type ScopedEventBus,
} from "../packages/shared/src/events/mfe-events.js";

// Verify events/core imports and types
import {
  sendMfeEvent as sendCore,
  listenMfeEvent as listenCore,
  createMfeEventBus as createCoreBus,
  type MfeEventPayload,
  type MfeEventMap,
  type ScopedCoreEventBus,
} from "../packages/shared/src/events/mfe-events-core.js";

// Verify constants imports and types
import {
  MFE_CONFIG,
  type ServiceConfig,
} from "../packages/shared/src/constants/config.js";

// Verify components/Button imports and types
import ButtonDefault, {
  Button as NamedBtn,
  type ButtonProps,
} from "../packages/shared/src/components/Button.jsx";

// Verify vite imports and types
import {
  defineRemoteConfig,
  DEFAULT_SHARED_DEPS,
} from "../packages/shared/src/vite/index.js";

// 1. Type assertions: Scoped Event Bus & State
const scopedBus: ScopedEventBus = createMfeEventBus({ sender: "AuthRemote", namespace: "auth" });
scopedBus.send("mfe:notification", { message: "User authenticated" });
const unsubBus = scopedBus.listen("mfe:ping", (detail: { message?: string }) => {
  console.log(detail.message);
}, { replayLast: true });
unsubBus();

scopedBus.setState("session", { userId: "user-123" });
const currentSession = scopedBus.getState<{ userId: string }>("session");
console.log(currentSession?.userId);

// 2. Type assertions: Global typed events & Replay
sendMfeEvent("mfe:notification", { message: "Global event" });
const unsubGlobal = listenMfeEvent("mfe:ping", (detail: { count?: number; message?: string }) => {
  console.log(detail.count, detail.message);
}, { replayLast: true });
unsubGlobal();

// 2b. Type assertions: Global State
import {
  useMfeEventState,
  getMfeState,
  setMfeState,
  listenMfeState,
} from "../packages/shared/src/index.js";

setMfeState("theme", "dark");
const currentTheme: string | undefined = getMfeState<string>("theme");
console.log(currentTheme);
const unsubState = listenMfeState<string>("theme", (val) => {
  console.log(val);
});
unsubState();

// 3. Type assertions: Shadow DOM on UniversalRemoteMount
const mountProps: UniversalRemoteMountProps = {
  loadRemote: () => Promise.resolve({}),
  shadowDom: true,
  remoteName: "IsolatedRemote",
};

// 4. Type assertions: DualModeReactMount
function DummyComponent(props: { title: string }) {
  return null;
}
const dualMount: DualModeReactMount<{ title: string }> = createReactMount(DummyComponent);
console.log(dualMount.Component);

const svc: ServiceConfig = MFE_CONFIG.HOST;
console.log(svc.NAME);

export {
  URM,
  createReactMount,
  createVanillaMount,
  normalizeRemoteModule,
  hookFromAdapters,
  ButtonDefault,
  NamedBtn,
  defineRemoteConfig,
  DEFAULT_SHARED_DEPS,
  mountProps,
  scopedBus,
};
