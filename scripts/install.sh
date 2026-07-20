#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUN_BIN="${HOME}/.bun/bin"
BUN="${BUN_BIN}/bun"

if [ ! -x "$BUN" ]; then
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$BUN_BIN:$PATH"

cd "$PROJECT_DIR"
echo "Installing dependencies..."
bun install

if [ -d "packages/cloud-audit-mcp" ]; then
  echo "Installing cloud-audit-mcp..."
  cd packages/cloud-audit-mcp && bun install && cd "$PROJECT_DIR"
fi

if [ -d "packages/hackbrowser-mcp" ]; then
  echo "Installing hackbrowser-mcp..."
  cd packages/hackbrowser-mcp && bun install && cd "$PROJECT_DIR"
fi

mkdir -p "$BUN_BIN"

cat > "${BUN_BIN}/cyberstrike" << 'SCRIPT'
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.bun/bin:$PATH"
cd /home/deuzimar/Downloads/CyberStrike/packages/cyberstrike
exec bun run src/index.ts "$@"
SCRIPT

cat > "${BUN_BIN}/redteamv3" << 'SCRIPT'
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.bun/bin:$PATH"
cd /home/deuzimar/Downloads/CyberStrike/packages/cyberstrike
exec bun run src/index.ts "$@"
SCRIPT

chmod +x "${BUN_BIN}/cyberstrike" "${BUN_BIN}/redteamv3"

echo ""
echo "Installed. Run with: redteamv3 --help"
