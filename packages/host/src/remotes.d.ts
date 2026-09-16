/**
 * Ambient Module Declarations for Federated Micro-Frontend Remotes.
 *
 * In module federation, remote modules are loaded over the network at runtime.
 * These declarations provide full TypeScript compile-time verification and IDE
 * autocomplete for imported remote components.
 */

declare module "demoService/App" {
  import { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

declare module "demoService/MfeDevWidget" {
  import { ComponentType } from "react";

  export interface MfeDevWidgetProps {
    title?: string;
  }

  const MfeDevWidget: ComponentType<MfeDevWidgetProps>;
  export default MfeDevWidget;
}
