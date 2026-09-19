import { execSync } from "node:child_process";
import { loadManifest } from "./manifest.js";

/**
 * Identify and optionally terminate processes holding specified TCP listening ports.
 * Supports Windows (via PowerShell Get-NetTCPConnection) and POSIX (via lsof -sTCP:LISTEN).
 *
 * @param {number[]} ports
 * @param {boolean} autoKill
 * @returns {Array<{ port: number, pid: number, command?: string }>} busy ports
 */
export function checkAndFreePorts(ports = [], autoKill = true) {
  const busyPorts = [];
  const isWindows = process.platform === "win32";
  const isDarwin = process.platform === "darwin";

  for (const port of ports) {
    let pids = [];

    try {
      if (isWindows) {
        // Query listening TCP sockets only (State = Listen)
        const cmd = `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`;
        const output = execSync(`powershell -NoProfile -Command "${cmd}"`, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        if (output) {
          pids = output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0);
        }
      } else {
        // Match ONLY processes listening on the TCP port (-sTCP:LISTEN excludes browser tabs)
        const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        if (output) {
          pids = output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0);
        }
      }
    } catch {
      pids = [];
    }

    for (const pid of pids) {
      let procName = "";
      if (isDarwin) {
        try {
          procName = execSync(`ps -p ${pid} -o comm=`, {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"],
          }).trim();
        } catch {
          procName = "";
        }

        // On macOS, port 5000 is occupied by default by AirPlay Receiver (ControlCenter)
        if (port === 5000 && (procName.includes("ControlCenter") || procName.includes("AirPlay"))) {
          console.warn(
            `[port-guard] ⚠️ Port 5000 is occupied by macOS AirPlay Receiver (${procName || "ControlCenter"}).`
          );
          console.warn(
            `[port-guard] 💡 Tip: Disable 'AirPlay Receiver' in macOS System Settings > General > AirDrop & AirPlay, or set HOST_PORT in .env.`
          );
          busyPorts.push({ port, pid, command: procName });
          continue; // Do not attempt to kill macOS system services
        }
      }

      busyPorts.push({ port, pid, command: procName });

      if (autoKill) {
        try {
          console.log(
            `[port-guard] ⚠️ Port ${port} is occupied by PID ${pid}${procName ? ` (${procName})` : ""}. Terminating process...`
          );
          if (isWindows) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          } else {
            // Send SIGTERM first for clean shutdown
            try {
              execSync(`kill -15 ${pid}`, { stdio: "ignore" });
            } catch {
              execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            }
          }
          console.log(`[port-guard] ✅ Freed port ${port}.`);
        } catch (killErr) {
          console.warn(
            `[port-guard] Failed to terminate PID ${pid} on port ${port}:`,
            killErr.message
          );
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
      5000,
      ...Object.values(manifest)
        .map((c) => c.port)
        .filter(Boolean),
    ];

    console.log(`[port-guard] Checking status of ports: ${portsToCheck.join(", ")}...`);
    const busy = checkAndFreePorts(portsToCheck, true);

    if (busy.length === 0) {
      console.log("[port-guard] All ports are free and clear! ✨");
    } else {
      console.log(`[port-guard] Cleared ${busy.length} busy port(s).`);
    }
  } catch (err) {
    console.error("[port-guard] Error:", err.message);
    process.exit(1);
  }
}
