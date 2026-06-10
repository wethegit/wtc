#!/usr/bin/env bash
set -euo pipefail

APP=wtc
REPO="wethegit/wtc"

Color_Off=''
Red=''
Green=''
Dim=''
Orange=''
Bold_Green=''
Bold_White=''

if [[ -t 1 ]]; then
  Color_Off='\033[0m'
  Red='\033[0;31m'
  Green='\033[0;32m'
  Dim='\033[0;2m'
  Orange='\033[38;5;214m'
  Bold_Green='\033[1;32m'
  Bold_White='\033[1m'
fi

error() {
  echo -e "${Red}error${Color_Off}:" "$@" >&2
  exit 1
}

info() {
  echo -e "${Dim}$*${Color_Off}"
}

info_bold() {
  echo -e "${Bold_White}$*${Color_Off}"
}

success() {
  echo -e "${Green}$*${Color_Off}"
}

usage() {
  cat <<EOF
wtc — Workflow Terminal Controller

Usage: install.sh [options]

Options:
    -h, --help              Display this help message
    -v, --version <version> Install a specific version (e.g., 0.1.0)
    -b, --binary <path>     Install from a local binary instead of downloading
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, etc.)

Examples:
Examples:
    curl -fsSL https://raw.githubusercontent.com/$REPO/main/install.sh | bash
    curl -fsSL https://raw.githubusercontent.com/$REPO/main/install.sh | bash -s -- --version 0.1.0
    ./install.sh --binary /path/to/wtc-darwin-arm64
}

tildify() {
  if [[ $1 = $HOME/* ]]; then
    echo "${1/$HOME\//\~/}"
  else
    echo "$1"
  fi
}

requested_version=${VERSION:-}
no_modify_path=false
binary_path=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    -v | --version)
      if [[ -n "${2:-}" ]]; then
        requested_version="$2"
        shift 2
      else
        error "--version requires a version argument"
      fi
      ;;
    -b | --binary)
      if [[ -n "${2:-}" ]]; then
        binary_path="$2"
        shift 2
      else
        error "--binary requires a path argument"
      fi
      ;;
    --no-modify-path)
      no_modify_path=true
      shift
      ;;
    *)
      echo -e "${Orange}Warning: Unknown option '$1'${Color_Off}" >&2
      shift
      ;;
  esac
done

INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

if [ -n "$binary_path" ]; then
  if [ ! -f "$binary_path" ]; then
    error "Binary not found at $binary_path"
  fi
  specific_version="local"
else
  raw_os=$(uname -s)
  os=$(echo "$raw_os" | tr '[:upper:]' '[:lower:]')
  case "$raw_os" in
    Darwin*) os="darwin" ;;
    Linux*) os="linux" ;;
    *) error "Unsupported OS: $raw_os" ;;
  esac

  arch=$(uname -m)
  if [[ "$arch" == "aarch64" ]]; then
    arch="arm64"
  fi
  if [[ "$arch" == "x86_64" ]]; then
    arch="x64"
  fi

  # Rosetta detection: if on macOS x64 under Rosetta, use arm64 binary
  if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
    rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
    if [ "$rosetta_flag" = "1" ]; then
      arch="arm64"
    fi
  fi

  combo="$os-$arch"
  case "$combo" in
    darwin-x64 | darwin-arm64 | linux-x64) ;;
    *) error "Unsupported OS/Arch: $os/$arch" ;;
  esac

  command -v curl >/dev/null 2>&1 || error "'curl' is required but not installed."

  target="$combo"

  if [ -z "$requested_version" ]; then
    url="https://github.com/$REPO/releases/latest/download/wtc-$target"
    specific_version=$(curl -sfL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p')

    if [[ -z "$specific_version" ]]; then
      error "Failed to fetch version information"
    fi
  else
    requested_version="${requested_version#v}"
    url="https://github.com/$REPO/releases/download/v${requested_version}/wtc-$target"
    specific_version=$requested_version

    http_status=$(curl -sI -o /dev/null -w "%{http_code}" "https://github.com/$REPO/releases/tag/v${requested_version}")
    if [ "$http_status" = "404" ]; then
      error "Release v${requested_version} not found"
    fi
  fi
fi

check_version() {
  local installed_version=""

  if command -v wtc >/dev/null 2>&1; then
    installed_version=$(wtc --version 2>/dev/null || echo "")
  elif [ -x "$INSTALL_DIR/$APP" ]; then
    installed_version=$("$INSTALL_DIR/$APP" --version 2>/dev/null || echo "")
  fi

  if [[ "$installed_version" == "$specific_version" ]]; then
    success "Version $specific_version already installed"
    exit 0
  fi
}

verify_checksum() {
  local binary_path="$1"
  local version="$2"
  local target="$3"

  local digest_url="https://api.github.com/repos/$REPO/releases/tags/v${version}"
  local expected
  expected=$(curl -sfL "$digest_url" | grep -A 15 "\"name\": \"wtc-${target}\"" | grep '"digest"' | sed 's/.*"digest": "sha256:\([^"]*\)".*/\1/')

  if [ -z "$expected" ]; then
    # No digest in API response (may be an older release), skip verification
    return 0
  fi

  local actual
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$binary_path" | cut -d' ' -f1)
  elif command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$binary_path" | cut -d' ' -f1)
  else
    # No checksum tool available, skip
    return 0
  fi

  if [ "$actual" != "$expected" ]; then
    rm -f "$binary_path"
    error "Checksum mismatch for wtc-${target}
  expected: sha256:$expected
  actual:   sha256:$actual"
  fi
}

unbuffered_sed() {
  if echo | sed -u -e "" >/dev/null 2>&1; then
    sed -nu "$@"
  elif echo | sed -l -e "" >/dev/null 2>&1; then
    sed -nl "$@"
  else
    local pad="$(printf "\n%512s" "")"
    sed -ne "s/$/\\${pad}/" "$@"
  fi
}

print_progress() {
  local bytes="$1"
  local length="$2"
  [ "$length" -gt 0 ] || return 0

  local width=50
  local percent=$((bytes * 100 / length))
  [ "$percent" -gt 100 ] && percent=100
  local on=$((percent * width / 100))
  local off=$((width - on))

  local filled=$(printf "%*s" "$on" "")
  filled=${filled// /■}
  local empty=$(printf "%*s" "$off" "")
  empty=${empty// /･}

  printf "\r${Orange}%s%s %3d%%${Color_Off}" "$filled" "$empty" "$percent" >&4
}

download_with_progress() {
  local url="$1"
  local output="$2"

  if [ -t 2 ]; then
    exec 4>&2
  else
    exec 4>/dev/null
  fi

  local tmp_dir=${TMPDIR:-/tmp}
  local basename="${tmp_dir}/${APP}_install_$$"
  local tracefile="${basename}.trace"

  rm -f "$tracefile"
  mkfifo "$tracefile"

  printf "\033[?25l" >&4

  trap "trap - RETURN; rm -f \"$tracefile\"; printf '\033[?25h' >&4; exec 4>&-" RETURN

  (
    curl --fail -sSL --trace-ascii "$tracefile" -o "$output" "$url"
  ) &
  local curl_pid=$!

  unbuffered_sed \
    -e 'y/ACDEGHLNORTV/acdeghlnortv/' \
    -e '/^0000: content-length:/p' \
    -e '/^<= recv data/p' \
    "$tracefile" |
    {
      local length=0
      local bytes=0

      while IFS=" " read -r -a line; do
        [ "${#line[@]}" -lt 2 ] && continue
        local tag="${line[0]} ${line[1]}"

        if [ "$tag" = "0000: content-length:" ]; then
          length="${line[2]}"
          length=$(echo "$length" | tr -d '\r')
          bytes=0
        elif [ "$tag" = "<= recv" ]; then
          local size="${line[3]}"
          bytes=$((bytes + size))
          if [ "$length" -gt 0 ]; then
            print_progress "$bytes" "$length"
          fi
        fi
      done
    }

  wait $curl_pid
  local ret=$?
  echo "" >&4
  return $ret
}

download_and_install() {
  info "Installing $APP version: $specific_version"

  local tmp_dir="${TMPDIR:-/tmp}/${APP}_install_$$"
  mkdir -p "$tmp_dir"

  if ! [ -t 2 ] || ! download_with_progress "$url" "$tmp_dir/$APP"; then
    curl --fail -# -L -o "$tmp_dir/$APP" "$url"
  fi

  verify_checksum "$tmp_dir/$APP" "$specific_version" "$target"

  chmod 755 "$tmp_dir/$APP"
  mkdir -p "$INSTALL_DIR"
  mv "$tmp_dir/$APP" "$INSTALL_DIR/$APP"

  rm -rf "$tmp_dir"
}

install_from_binary() {
  info "Installing $APP from: $binary_path"
  mkdir -p "$INSTALL_DIR"
  cp "$binary_path" "${INSTALL_DIR}/$APP"
  chmod 755 "${INSTALL_DIR}/$APP"
}

# --- Main ---

if [ -n "$binary_path" ]; then
  install_from_binary
else
  check_version
  download_and_install
fi

# --- PATH injection ---

add_to_path() {
  local config_file=$1
  local command=$2

  if grep -Fxq "$command" "$config_file" 2>/dev/null; then
    return
  fi

  if [[ -w $config_file ]]; then
    echo -e "\n# $APP" >>"$config_file"
    echo "$command" >>"$config_file"
  else
    return 1
  fi
}

XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}

current_shell=$(basename "$SHELL")
case $current_shell in
  fish)
    shell_configs="$HOME/.config/fish/config.fish"
    path_cmd="fish_add_path $INSTALL_DIR"
    ;;
  zsh)
    shell_configs="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc $XDG_CONFIG_HOME/zsh/.zshenv"
    path_cmd="export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
  bash)
    shell_configs="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
    path_cmd="export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
  ash | sh)
    shell_configs="$HOME/.ashrc $HOME/.profile /etc/profile"
    path_cmd="export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
  *)
    shell_configs="$HOME/.bashrc $HOME/.bash_profile"
    path_cmd="export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
esac

if [[ "$no_modify_path" != "true" ]] && [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  config_file=""
  for file in $shell_configs; do
    if [[ -f $file ]]; then
      config_file=$file
      break
    fi
  done

  if [[ -z $config_file ]]; then
    case $current_shell in
      zsh) config_file="${ZDOTDIR:-$HOME}/.zshrc" ;;
      bash) config_file="$HOME/.bashrc" ;;
      fish) config_file="$HOME/.config/fish/config.fish" ;;
      *) config_file="$HOME/.profile" ;;
    esac
  fi

  if add_to_path "$config_file" "$path_cmd"; then
    tilde_config=$(tildify "$config_file")
    info "Added \"$(tildify "$INSTALL_DIR")\" to \$PATH in \"$tilde_config\""
  fi
fi

refresh_cmd=""
if [[ "$no_modify_path" != "true" ]] && [[ -n "${config_file:-}" ]] && [[ -w "$config_file" ]]; then
  case $current_shell in
    fish) refresh_cmd="source $config_file" ;;
    zsh) refresh_cmd="exec $SHELL" ;;
    bash) refresh_cmd="source $config_file" ;;
    ash | sh) refresh_cmd="source $config_file" ;;
  esac
fi

if [ -n "${GITHUB_ACTIONS-}" ] && [ "${GITHUB_ACTIONS}" == "true" ]; then
  echo "$INSTALL_DIR" >>"$GITHUB_PATH"
  info "Added $(tildify "$INSTALL_DIR") to \$GITHUB_PATH"
fi

# --- Post-install message ---

echo ""
echo -e "${Dim}  _    _ _______ _______ ${Color_Off}"
echo -e "${Dim} | |  | |__   __|__   __|${Color_Off}"
echo -e "${Dim} | |  | |  | |     | |   ${Color_Off}"
echo -e "${Dim} | |  | |  | |     | |   ${Color_Off}"
echo -e "${Dim} | |__| |  | |     | |   ${Color_Off}"
echo -e "${Dim}  \\____/   |_|     |_|   ${Color_Off}"
echo ""

exe="$INSTALL_DIR/$APP"
success "$APP was installed successfully to ${Bold_Green}$(tildify "$exe")"

if command -v "$APP" >/dev/null; then
  echo ""
  info "Run 'wtc --help' to get started."
  exit 0
fi

echo ""
echo "To add $APP to your PATH, restart your terminal or run:"
echo ""

if [[ "$no_modify_path" != "true" ]] && [[ -n ${refresh_cmd:-} ]]; then
  info_bold "  $refresh_cmd"
fi

info_bold "  wtc --help"
echo ""
