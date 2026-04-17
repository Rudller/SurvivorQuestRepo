const fs = require("node:fs");
const path = require("node:path");

const nestedStartPath = path.join(__dirname, "SurvivorQuestRepo", "start.cjs");

if (!fs.existsSync(nestedStartPath)) {
  process.stderr.write(
    `Cannot find nested start script at: ${nestedStartPath}\n` +
      "Run commands from the inner workspace folder or restore SurvivorQuestRepo/start.cjs.\n",
  );
  process.exit(1);
}

require(nestedStartPath);
