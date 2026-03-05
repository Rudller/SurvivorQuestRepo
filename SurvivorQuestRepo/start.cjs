const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2] ?? "dev";

if (mode !== "dev") {
  process.stderr.write("Unknown mode. Use: pnpm start dev\n");
  process.exit(1);
}

const rootDir = __dirname;
const adminLockFile = path.join(rootDir, "apps", "admin", ".next", "dev", "lock");

try {
  fs.rmSync(adminLockFile, { force: true });
} catch {
  // noop
}

const services = {
  admin: {
    label: "Admin",
    args: ["--filter", "admin", "dev"],
    stdio: "pipe",
    ready: false,
    resolvedUrl: null,
  },
  backend: {
    label: "Backend",
    args: ["--filter", "backend", "dev"],
    stdio: "pipe",
    ready: false,
    resolvedUrl: null,
  },
  mobile: {
    label: "Mobile",
    args: ["--filter", "mobile", "dev"],
    stdio: "inherit",
    ready: false,
    resolvedUrl: null,
  },
};

let shuttingDown = false;
let summaryPrinted = false;
let probeInProgress = false;

const children = [];

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "");
}

function printPrefixed(stream, prefix, chunk) {
  const text = chunk.toString();
  const lines = stripAnsi(text).replace(/\r/g, "").split("\n");

  for (const line of lines) {
    if (!line) {
      continue;
    }

    stream.write(`${prefix}${line}\n`);
  }
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    });

    killer.on("error", () => {
      // noop
    });

    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // noop
  }
}

function shutdown(exitCode = 0, reason = "") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearInterval(healthInterval);

  if (reason) {
    process.stderr.write(`${reason}\n`);
  }

  for (const child of children) {
    killProcessTree(child.pid);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function spawnService(serviceKey) {
  const service = services[serviceKey];

  const child = spawn("pnpm", service.args, {
    cwd: rootDir,
    shell: true,
    stdio: service.stdio,
  });

  children.push(child);

  if (service.stdio === "pipe") {
    child.stdout.on("data", (chunk) => {
      printPrefixed(process.stdout, `[${service.label}] `, chunk);
    });

    child.stderr.on("data", (chunk) => {
      printPrefixed(process.stderr, `[${service.label}] `, chunk);
    });
  }

  child.on("error", () => {
    shutdown(1, `${service.label} failed to start.`);
  });

  child.on("exit", (code) => {
    if (shuttingDown) {
      return;
    }

    const normalizedCode = typeof code === "number" ? code : 1;
    shutdown(normalizedCode, `${service.label} exited with code ${normalizedCode}.`);
  });
}

async function probeUrl(url, validator) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();

    if (response.status >= 500) {
      return false;
    }

    if (typeof validator === "function" && !validator(body)) {
      return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runHealthChecks() {
  if (probeInProgress || shuttingDown) {
    return;
  }

  probeInProgress = true;

  try {
    if (!services.backend.ready) {
      const backendReady = await probeUrl("http://localhost:3001/", null);

      if (backendReady) {
        services.backend.ready = true;
        services.backend.resolvedUrl = "http://localhost:3001";
      }
    }

    if (!services.admin.ready) {
      const adminCandidates = ["http://localhost:3100", "http://localhost:3101"];

      for (const url of adminCandidates) {
        const ready = await probeUrl(`${url}/`, null);

        if (ready) {
          services.admin.ready = true;
          services.admin.resolvedUrl = url;
          break;
        }
      }
    }

    if (!services.mobile.ready) {
      const mobileCandidates = [8081, 8082, 8083].map((port) => `http://localhost:${port}`);

      for (const baseUrl of mobileCandidates) {
        const ready = await probeUrl(`${baseUrl}/status`, (body) => /packager-status:running/i.test(body));

        if (ready) {
          services.mobile.ready = true;
          services.mobile.resolvedUrl = baseUrl;
          break;
        }
      }
    }

    if (!summaryPrinted && services.admin.ready && services.backend.ready && services.mobile.ready) {
      summaryPrinted = true;

      process.stdout.write("\n");
      process.stdout.write("=== Podsumowanie uruchomienia ===\n");
      process.stdout.write(`Admin (panel):   ${services.admin.resolvedUrl}\n`);
      process.stdout.write(`Backend (API):   ${services.backend.resolvedUrl}\n`);
      process.stdout.write(`Mobile (Expo):   ${services.mobile.resolvedUrl}\n`);
      process.stdout.write("QR: jesli nie widzisz, kliknij terminal Mobile i nacisnij `s` lub `w`.\n\n");
    }
  } finally {
    probeInProgress = false;
  }
}

const healthInterval = setInterval(() => {
  void runHealthChecks();
}, 1000);

void runHealthChecks();

spawnService("backend");
spawnService("admin");
spawnService("mobile");
