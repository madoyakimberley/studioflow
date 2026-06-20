import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIR = path.join(__dirname, "src");
const FILE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];

const REPLACEMENTS = {
  // 1. Fix the broken variables from the first migrator
  "var(--text-primary)": "var(--text-main)",
  "var(--text-secondary)": "var(--text-muted)",

  // 2. Strip hardcoded Tailwind classes that break light mode
  "text-white": "text-theme-text",
  "text-slate-200": "text-theme-text",
  "text-slate-300": "text-theme-muted",
  "text-slate-400": "text-theme-muted",

  // 3. Catch the specific hex codes the first migrator missed!
  "#d4e4fa": "var(--text-main)",
  "#bccabb": "var(--text-muted)",
  "#869486": "var(--border-outline)",
  "#6bfb9a": "var(--color-primary)",
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) walkDir(dirPath, callback);
    else callback(dirPath);
  });
}

walkDir(TARGET_DIR, (filePath) => {
  if (!FILE_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return;
  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  for (const [search, replace] of Object.entries(REPLACEMENTS)) {
    content = content.split(search).join(replace);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(
      `✅ Fixed text bugs in: ${path.relative(process.cwd(), filePath)}`,
    );
  }
});
