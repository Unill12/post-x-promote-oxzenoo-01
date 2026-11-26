// main.ts — entry program for "Promote make.fun's make-your-own-bounty post on X".
//
// Copies POST.json (the address of the @oxzenoo quote-post on X) from this
// repository into the output directory. That is all it has to do: the house
// reads the post itself from X and scores it on its replies, reposts and
// quotes.
//
// Every path is resolved from this file's own directory (import.meta.url),
// never from the working directory, so the program works no matter where
// the grader runs it from.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// The gate's limits for POST.json (see the kit's RULES.txt): at most 16384
// bytes, and its url must be an X post's address with a digits-only id.
// A query or fragment after the id is read past, never kept.
const MAX_POST_JSON_BYTES = 16384;
const POST_URL_PATTERN =
  /^https:\/\/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)$/;

function parsePostUrl(rawUrl: string): string {
  const bare = rawUrl.split(/[?#]/, 1)[0];
  const match = POST_URL_PATTERN.exec(bare);
  if (match === null) {
    throw new Error(
      `POST.json url is not an X post address: ${rawUrl} ` +
        `(expected https://x.com/<handle>/status/<id>)`,
    );
  }
  return `https://x.com/${match[1]}/status/${match[2]}`;
}

async function main(): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const botDir = process.env.MAKEFUN_BOT_DIR
    ? resolve(process.env.MAKEFUN_BOT_DIR)
    : scriptDir;
  const outDir = process.env.MAKEFUN_OUTPUT_DIR
    ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
    : join(scriptDir, "out");

  const source = join(botDir, "POST.json");
  const raw = await readFile(source, "utf8");
  if (Buffer.byteLength(raw, "utf8") > MAX_POST_JSON_BYTES) {
    throw new Error(
      `POST.json is ${Buffer.byteLength(raw, "utf8")} bytes, over the 16384-byte cap`,
    );
  }
  const post: unknown = JSON.parse(raw);
  if (
    typeof post !== "object" ||
    post === null ||
    typeof (post as { url?: unknown }).url !== "string" ||
    ((post as { url: string }).url.length === 0)
  ) {
    throw new Error("POST.json must be an object with a non-empty string url");
  }
  const url = parsePostUrl((post as { url: string }).url);

  await mkdir(outDir, { recursive: true });
  await copyFile(source, join(outDir, "POST.json"));
  console.log(`copied POST.json (${url}) to ${outDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
