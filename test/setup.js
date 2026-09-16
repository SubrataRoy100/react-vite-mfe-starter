import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Automatically unmount and cleanup rendered React trees after each test
afterEach(() => {
  cleanup();
});
