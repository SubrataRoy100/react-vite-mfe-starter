import { execSync } from "node:child_process";
import { loadManifest } from "./manifest.js";

/**
 * Identify and optionally kill processes holding specified TCP ports.
 * Supports Windows (via PowerShell / netstat / taskkill) and POSIX (via lsof / fuser).
 *
 * @param {number[]} ports
 * @param {boolean} autoKill
 * @returns {number[]} ports that were busy
 */
export function checkAndFreePorts(ports = [], autoKill = true) {
  const busyPorts = [];
  const isWindows = process.platform === "win32";

  for (const port of ports) {
    let pid = null;

    try {
      if (isWindows) {
        // Find PID holding the port
        const cmd = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1`;
        const output = execSync(`powershell -NoProfile -Command "${cmd}"`, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        if (output && !isNaN(Number(output))) {
          pid = Number(output);
        }
      } else {
        const output = execSync(`lsof -t -i:${port}`, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        if (output && !isNaN(Number(output))) {
          pid = Number(output);
        }
      }
    } catch {
      pid = null;
    }

    if (pid && pid > 0) {
      busyPorts.push({ port, pid });
      if (autoKill) {
        try {
          console.log(`[port-guard] ⚠️ Port ${port} is occupied by PID ${pid}. Terminating ghost process...`);
          if (isWindows) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          } else {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
          }
          console.log(`[port-guard] ✅ Freed port ${port}.`);
        } catch (killErr) {
          console.warn(`[port-guard] Failed to kill PID ${pid} on port ${port}:`, killErr.message);
        }
      }
    }
  }

  return busyPorts;
}

// Standalone CLI execution
if (process.argv[1]?.endsWith("port-guard.js")) {
  try {
    const manifest = loadManifest();
    const portsToCheck = [
      5000, // Host default
      ...Object.values(manifest).map((c) => c.port).filter(Boolean),
    ];

    console.log(`[port-guard] Checking status of ports: ${portsToCheck.join(", ")}...`);
    const busy = checkAndFreePorts(portsToCheck, true);

    if (busy.length === 0) {
      console.log(`[port-guard] All ports are free and clear! ✨`);
    } else {
      console.log(`[port-guard] Cleared ${busy.length} busy port(s).`);
    }
  } catch (err) {
    console.error("[port-guard] Error:", err.message);
    process.exit(1);
  }
}
