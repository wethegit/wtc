class Wtc < Formula
  desc "CLI tool for managing GitHub, AWS Amplify, and Teamwork"
  homepage "https://github.com/anomalyco/homebrew-wtc"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-darwin-arm64"
      sha256 "PLACEHOLDER_MACOS_ARM64"
    else
      url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-darwin-x64"
      sha256 "PLACEHOLDER_MACOS_X64"
    end
  end

  on_linux do
    url "https://github.com/anomalyco/homebrew-wtc/releases/download/v#{version}/wtc-linux-x64"
    sha256 "PLACEHOLDER_LINUX_X64"
  end

  def install
    bin.install Dir["wtc-*"].first => "wtc"
  end

  test do
    assert_match "wtc", shell_output("#{bin}/wtc --version")
  end
end
