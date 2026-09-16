# @mfe/shared

Internal monorepo workspace package providing common utilities, cross-micro-frontend event bus messaging, and configuration constants.

## Installation

In any workspace package:

```json
"dependencies": {
  "@mfe/shared": "workspace:*"
}
```

## Usage

```javascript
import { sendMfeEvent, useMfeEventListener, MFE_EVENTS, MFE_CONFIG } from "@mfe/shared";

// Dispatch an event
sendMfeEvent(MFE_EVENTS.PING, { message: "Hello from micro-frontend!" });

// Listen for events in a React component
useMfeEventListener(MFE_EVENTS.PONG, (payload) => {
  console.log("Received pong:", payload);
});
```
