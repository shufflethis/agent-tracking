import { CLI_FILE, CLI_SHA256, CLI_VERSION } from "./format";
import { SITE_ORIGIN } from "../site";

export function buildInstallScript(opts: {
  origin?: string;
  file?: string;
  sha256?: string;
  version?: string;
} = {}): string {
  const origin = (opts.origin ?? SITE_ORIGIN).replace(/\/+$/, "");
  const file = opts.file ?? CLI_FILE;
  const sha256 = opts.sha256 ?? CLI_SHA256;
  const version = opts.version ?? CLI_VERSION;

  return `#!/bin/sh
# Agent Tracking CLI installer (${origin}/install.sh)
# Downloads the release tarball, verifies its SHA-256 checksum via Node crypto,
# installs into ~/.agenttracking/pkg/${version}, and links 'agenttracking' into PATH.
set -eu

ORIGIN="${origin}"
TARBALL="${file}"
EXPECTED_SHA256="${sha256}"
VERSION="${version}"

if ! command -v node >/dev/null 2>&1; then
  echo "agenttracking requires Node.js >= 18. Install Node.js first: https://nodejs.org" >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "agenttracking requires Node.js >= 18 (found $(node -v))." >&2
  exit 1
fi

HOME_DIR="\${AGENTTRACKING_HOME:-$HOME/.agenttracking}"
PKG_DIR="$HOME_DIR/pkg/$VERSION"
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t agenttracking)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

ARCHIVE="$TMP_DIR/$TARBALL"
curl -fsSL "$ORIGIN/downloads/$TARBALL" -o "$ARCHIVE"

ACTUAL_SHA256="$(node -e '
  const crypto = require("node:crypto"), fs = require("node:fs");
  process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"));
' "$ARCHIVE")"

if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
  echo "Checksum mismatch for $TARBALL (expected $EXPECTED_SHA256, got $ACTUAL_SHA256). Aborting." >&2
  exit 1
fi

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"
tar -xzf "$ARCHIVE" -C "$TMP_DIR"
cp -R "$TMP_DIR/package/"* "$PKG_DIR/"

BIN_DIR="$HOME/.local/bin"
case ":\${PATH:-}:" in
  *":$HOME/.local/bin:"*) BIN_DIR="$HOME/.local/bin" ;;
  *":/opt/homebrew/bin:"*) [ -d /opt/homebrew/bin ] && [ -w /opt/homebrew/bin ] && BIN_DIR="/opt/homebrew/bin" ;;
  *":/usr/local/bin:"*) [ -d /usr/local/bin ] && [ -w /usr/local/bin ] && BIN_DIR="/usr/local/bin" ;;
esac
if [ -n "\${AGENTTRACKING_BIN_DIR:-}" ]; then
  BIN_DIR="$AGENTTRACKING_BIN_DIR"
fi

mkdir -p "$BIN_DIR"
NODE_BIN="$(command -v node)"
LAUNCHER="$BIN_DIR/agenttracking"
cat > "$LAUNCHER" <<EOF
#!/bin/sh
exec "$NODE_BIN" "$PKG_DIR/dist/cli.js" "\\$@"
EOF
chmod 755 "$LAUNCHER"

echo "Installed agenttracking $VERSION to $LAUNCHER (SHA-256 verified)."
case ":\${PATH:-}:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Add to PATH if needed: export PATH=\\"$BIN_DIR:\\$PATH\\"" ;;
esac

if [ "$#" -gt 0 ]; then
  if [ -t 1 ] && [ -r /dev/tty ]; then
    exec "$LAUNCHER" "$@" </dev/tty
  else
    exec "$LAUNCHER" "$@"
  fi
fi
`;
}
