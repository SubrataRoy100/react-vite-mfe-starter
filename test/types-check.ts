// Verify root imports and types
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  useMfeEventListener,
  UniversalRemoteMount,
  createMfeEventBus,
  Button,
} from "../packages/shared/dist/index.js";

// Verify adapters imports and types
import {
  UniversalRemoteMount as URM,
  createReactMount,
  createVanillaMount,
  normalizeRemoteModule,
  useMfeEventListener as hookFromAdapters,
  type UniversalRemoteMountProps,
  type DualModeReactMount,
} from "../packages/shared/dist/adapters/index.js";

// Verify events imports and types
import {
  MFE_EVENTS as eventsConst,
  sendMfeEvent as sendEvt,
  useMfeEventListener as hookFromEvents,
  createMfeEventBus as createEventsBus,
  type ScopedEventBus,
} from "../packages/shared/dist/events/index.js";

// Verify events/core imports and types
import {
  sendMfeEvent as sendCore,
  listenMfeEvent as listenCore,
  createMfeEventBus as createCoreBus,
  type MfeEventPayload,
  type MfeEventMap,
  type ScopedCoreEventBus,
} from "../packages/shared/dist/events/core.js";

// Verify constants imports and types
import {
  MFE_CONFIG,
  type ServiceConfig,
} from "../packages/shared/dist/constants/index.js";

// Verify components/Button imports and types
import ButtonDefault, {
  Button as NamedBtn,
  type ButtonProps,
} from "../packages/shared/dist/components/Button.js";

// Verify vite imports and types
import {
  defineRemoteConfig,
  DEFAULT_SHARED_DEPS,
  type RemoteConfigOptions,
} from "../packages/shared/dist/vite/index.js";

// 1. Type assertions: Scoped Event Bus
const scopedBus: ScopedEventBus = createMfeEventBus({ sender: "OrderRemote", namespace: "checkout" });
scopedBus.send("mfe:cart_update", { itemCount: 3, total: 99.99 });
const unsubBus = scopedBus.listen("mfe:order_placed", (detail) => {
  console.log(detail.orderId, detail.total, detail.itemCount);
});
unsubBus();

// 2. Type assertions: Global typed events
sendMfeEvent("mfe:cart_update", { itemCount: 5, total: 150 });
const unsubGlobal = listenMfeEvent("mfe:ping", (detail) => {
  console.log(detail.count, detail.message);
});
unsubGlobal();

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
