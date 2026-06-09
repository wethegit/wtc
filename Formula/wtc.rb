class Wtc < Formula
  desc "We The Collective all-around CLI helper tool for managing GitHub, AWS Amplify, and Teamwork"
  homepage "https://github.com/wethegit/homebrew-wtc"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-darwin-arm64"
      sha256 :no_check
    else
      url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-darwin-x64"
      sha256 :no_check
    end
  end

  on_linux do
    url "https://github.com/wethegit/homebrew-wtc/releases/download/v#{version}/wtc-linux-x64"
    sha256 :no_check
  end

  def install
    bin.install Dir["wtc-*"].first => "wtc"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/wtc --version")
  end
end
