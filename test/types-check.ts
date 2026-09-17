// Verify root imports and types
import {
  MFE_EVENTS,
  sendMfeEvent,
  listenMfeEvent,
  useMfeEventListener,
  UniversalRemoteMount,
  Button,
} from "../packages/shared/dist/index.js";

// Verify adapters imports and types
import {
  UniversalRemoteMount as URM,
  createReactMount,
  createVanillaMount,
  useMfeEventListener as hookFromAdapters,
} from "../packages/shared/dist/adapters/index.js";

// Verify events imports and types
import {
  MFE_EVENTS as eventsConst,
  sendMfeEvent as sendEvt,
  useMfeEventListener as hookFromEvents,
} from "../packages/shared/dist/events/index.js";

// Verify events/core imports and types
import {
  sendMfeEvent as sendCore,
  listenMfeEvent as listenCore,
  type MfeEventPayload,
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

// Type assertions to ensure TypeScript correctly resolves types
const payload: MfeEventPayload = { message: "test", sender: "tester", timestamp: Date.now() };
sendMfeEvent(MFE_EVENTS.PING, payload);
const unsubscribe: () => void = listenMfeEvent(MFE_EVENTS.PING, (detail: MfeEventPayload) => {});
unsubscribe();

const svc: ServiceConfig = MFE_CONFIG.HOST;
console.log(svc.NAME);

export {
  URM,
  createReactMount,
  createVanillaMount,
  hookFromAdapters,
  ButtonDefault,
  NamedBtn,
  defineRemoteConfig,
  DEFAULT_SHARED_DEPS,
};
