import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM Alternative for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TARGET_DIR = path.join(__dirname, "src"); // Change to your target folder if needed
const FILE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];

// Master Color Mapping Dictionary
const COLOR_MAP = {
  // Text Mappings
  "#8e93a6": "var(--text-muted)",
  "#94a3b8": "var(--text-muted)",
  "#958ea0": "var(--text-muted)",
  "#6b7280": "var(--text-muted)",
  "#64748b": "var(--text-muted)",
  "#c6c5d1": "var(--text-secondary)",
  "#7a849c": "var(--text-secondary)",
  "#5c657a": "var(--text-secondary)",
  "#dae2fd": "var(--text-primary)",
  "#e0e2ec": "var(--text-primary)",

  // Primary Branding & Accents
  "#a5a1f6": "var(--color-theme-primary)",
  "#afbaff": "var(--color-theme-primary)",
  "#b0adfc": "var(--color-theme-primary)",
  "#c3c2ff": "var(--color-theme-primary)",
  "#d050c2": "var(--color-theme-secondary)",
  "#d3d7ff": "var(--color-theme-primary)",
  "#d946ef": "var(--color-theme-secondary)",
  "#dac5ff": "var(--color-theme-primary)",
  "#e364a7": "var(--color-theme-secondary)",
  "#e8b3ff": "var(--color-theme-secondary)",
  "#dda6f5": "var(--color-theme-secondary)",
  "#f8c1ee": "var(--color-theme-secondary)",
  "#4361ee": "var(--color-theme-primary)",
  "#8b5cf6": "var(--color-theme-primary)",
  "#9d4edd": "var(--color-theme-primary)",
  "#c084fc": "var(--color-theme-secondary)",
  "#ec4899": "var(--color-theme-secondary)",

  // Dark Background Layers & Borders
  "#030407": "var(--bg-main)",
  "#030712": "var(--bg-main)",
  "#050810": "var(--bg-main)",
  "#06070b": "var(--bg-main)",
  "#070b14": "var(--bg-surface)",
  "#0a0d13": "var(--bg-surface)",
  "#0a0f1d": "var(--bg-surface)",
  "#0b0e15": "var(--bg-surface)",
  "#0b1326": "var(--bg-surface)",
  "#0c0f16": "var(--bg-main)",
  "#0d111b": "var(--bg-main)",
  "#0f111a": "var(--bg-surface)",
  "#111827": "var(--bg-surface)",
  "#12141c": "var(--bg-surface)",
  "#12151d": "var(--bg-surface)",
  "#121929": "var(--border-outline)",
  "#13192e": "var(--bg-surface)",
  "#131b2e": "var(--bg-surface)",
  "#161924": "var(--bg-surface)",
  "#161f33": "var(--border-outline)",
  "#171a25": "var(--bg-surface)",
  "#171f33": "var(--border-outline)",
  "#1b1f2c": "var(--bg-surface)",
  "#1b2131": "var(--border-outline)",
  "#1d2027": "var(--bg-surface)",
  "#1d212f": "var(--bg-surface)",
  "#1e2645": "var(--border-outline)",
  "#212d4a": "var(--border-outline)",
  "#272a32": "var(--bg-surface)",
  "#32353d": "var(--border-outline)",
  "#4a4e5a": "var(--border-outline)",
  "#0e1224": "var(--bg-main)",
  "#1e2338": "var(--bg-surface)",
  "#171c30": "var(--bg-surface)",
  "#13182b": "var(--bg-surface)",

  // Semantic Status / Alert Vectors
  "#a7ffb4": "var(--color-success)",
  "#ffb4ab": "var(--color-danger)",
  "#ef4444": "var(--color-danger)",
  "#f87171": "var(--color-danger)",
};

// Recursive directory walker
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

// Processing Logic
let filesModified = 0;

walkDir(TARGET_DIR, (filePath) => {
  if (!FILE_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return;

  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  // Find all hex codes (e.g. #0c0f16 or #FFF)
  const hexRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;

  content = content.replace(hexRegex, (match) => {
    // Normalize to lowercase for mapping
    const lowerMatch = match.toLowerCase();

    // Check if it exists in our map
    if (COLOR_MAP[lowerMatch]) {
      return COLOR_MAP[lowerMatch];
    }

    // Return original if no mapping is found
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
    filesModified++;
  }
});

console.log(`\n🎉 Migration Complete! Modified ${filesModified} files.`);
