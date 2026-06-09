#!/usr/bin/env bash
set -euo pipefail

REPO="wethegit/homebrew-wtc"
VERSION="${VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

get_latest_release() {
  curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep '"tag_name":' \
    | sed -E 's/.*"([^"]+)".*/\1/'
}

usage() {
  echo "Usage: curl -fsSL https://raw.githubusercontent.com/$REPO/main/install.sh | bash"
  echo "       VERSION=v1.2.3 bash -c \"\$(curl -fsSL ...)\""
  echo ""
  echo "Environment variables:"
  echo "  VERSION       Version tag to install (default: latest)"
  echo "  INSTALL_DIR   Installation directory (default: /usr/local/bin)"
  exit 1
}

detect_platform() {
  local os arch

  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux)  os="linux" ;;
    *)      echo "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac

  case "$(uname -m)" in
    arm64|aarch64) arch="arm64" ;;
    x86_64|amd64)  arch="x64" ;;
    *)             echo "Unsupported arch: $(uname -m)"; exit 1 ;;
  esac

  if [ "$os" = "linux" ] && [ "$arch" = "arm64" ]; then
    echo "Linux arm64 binaries are not published yet." >&2
    exit 1
  fi

  echo "${os}-${arch}"
}

install_binary() {
  local source_path="$1"
  local target_path="$2"

  if [ -w "$INSTALL_DIR" ]; then
    install -m 0755 "$source_path" "$target_path"
  elif command -v sudo >/dev/null 2>&1; then
    sudo install -m 0755 "$source_path" "$target_path"
  else
    echo "Install directory is not writable: $INSTALL_DIR" >&2
    echo "Set INSTALL_DIR to a writable directory or run with permissions to write there." >&2
    exit 1
  fi
}

ensure_install_dir() {
  if [ -d "$INSTALL_DIR" ]; then
    return
  fi

  if mkdir -p "$INSTALL_DIR" 2>/dev/null; then
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$INSTALL_DIR"
    return
  fi

  echo "Could not create install directory: $INSTALL_DIR" >&2
  exit 1
}

main() {
  local platform
  platform="$(detect_platform)"

  if [ "$VERSION" = "latest" ]; then
    VERSION="$(get_latest_release)"
  fi

  local url="https://github.com/$REPO/releases/download/$VERSION/wtc-${platform}"
  local binary_path="$INSTALL_DIR/wtc"
  local tmp_path

  ensure_install_dir
  tmp_path="$(mktemp)"
  trap 'rm -f "$tmp_path"' EXIT

  echo "Downloading wtc $VERSION ($platform)..."
  curl -fsSL "$url" -o "$tmp_path"
  install_binary "$tmp_path" "$binary_path"

  echo "Installed wtc to $binary_path"
  echo "Run 'wtc' to start."
}

main
