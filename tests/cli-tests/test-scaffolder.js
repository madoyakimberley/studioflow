import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { CommandProcessExecutor } from "../../apps/cli/src/CommandProcessExecutor.js";
import fs from "fs/promises";
import path from "path";

// Color utilities for beautiful test output
const colors = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m", // FIXED: Added dim property to stop 'undefined' logs
  reset: "\x1b[0m",
};

async function testAllLanguages() {
  console.log(
    `\n${colors.cyan}${colors.bold}🧪 Starting StudioFlow Multi-Language Blueprint & Execution Test...${colors.reset}\n`,
  );

  const multiLangManifest = {
    projectName: "Polyglot Test Matrix",
    folderStructure: "monorepo",
    deploymentTarget: "render",
    services: [
      {
        name: "api-python",
        runtime: "python",
        orm: "sqlalchemy",
        rootDir: "apps/api-python",
      },
      {
        name: "api-ruby",
        runtime: "ruby",
        orm: "active_record",
        rootDir: "apps/api-ruby",
      },
      {
        name: "api-php",
        runtime: "php",
        orm: "eloquent",
        rootDir: "apps/api-php",
      },
    ],
  };

  try {
    const scaffolder = new MultiStackTemplateScaffolder(
      "studioflow-polyglot-test",
      multiLangManifest,
    );
    scaffolder.githubRepoUrl = "https://github.com/mock/test-repo";
    const executor = new CommandProcessExecutor();

    console.log(
      `${colors.yellow}🏃‍♂️ Phase 1: Executing generation pipelines...${colors.reset}`,
    );

    for (const srv of multiLangManifest.services) {
      const targetDir = path.join(scaffolder.targetPath, srv.rootDir);
      await fs.mkdir(targetDir, { recursive: true });

      console.log(
        `   ${colors.dim}Generating blueprints for [${srv.runtime}] with ORM [${srv.orm}]...${colors.reset}`,
      );
      await scaffolder.ormGenerator.generate(targetDir, srv, "pnpm");
    }

    console.log(
      `\n${colors.cyan}🐳 Phase 2: Booting Ephemeral Docker Containers for Syntax Verification...${colors.reset}`,
    );

    const dockerTests = [
      {
        lang: "Python",
        cmd: `docker run --rm -v "${path.join(scaffolder.targetPath, "apps/api-python")}:/app" -w /app python:3.12-slim python -m py_compile src/db/models.py`,
      },
      {
        lang: "Ruby",
        cmd: `docker run --rm -v "${path.join(scaffolder.targetPath, "apps/api-ruby")}:/app" -w /app ruby:3.3-slim ruby -c models/post.rb`,
      },
      {
        lang: "PHP",
        cmd: `docker run --rm -v "${path.join(scaffolder.targetPath, "apps/api-php")}:/app" -w /app php:8.2-cli php -l app/Models/User.php`,
      },
    ];

    let allPassed = true; // FIXED: Added a tracker to strictly monitor success

    for (const test of dockerTests) {
      console.log(
        `\n   ${colors.yellow}Testing ${test.lang} Engine...${colors.reset}`,
      );
      const result = await executor.execute(test.cmd, process.cwd(), true);

      if (result.success) {
        console.log(
          `   ${colors.green}✅ ${test.lang} compiled flawlessly in isolated container.${colors.reset}`,
        );
      } else {
        console.log(
          `   ${colors.red}❌ ${test.lang} compilation failed! Check logs above.${colors.reset}`,
        );
        allPassed = false; // FIXED: Mark the entire test suite as failed if one errors out
      }
    }

    // FIXED: Properly gate the success message
    if (allPassed) {
      console.log(
        `\n${colors.green}${colors.bold}🎉 ALL BLUEPRINTS GENERATED AND VERIFIED SUCCESSFULLY!${colors.reset}\n`,
      );
    } else {
      console.log(
        `\n${colors.red}${colors.bold}⚠️ PHASE 2 COMPLETED WITH ERRORS. Check the failed containers above!${colors.reset}\n`,
      );
    }
  } catch (error) {
    console.error(
      `\n${colors.red}❌ Generation pipeline caught an unhandled crash:${colors.reset}`,
    );
    console.error(error.stack);
  }
}

testAllLanguages();
