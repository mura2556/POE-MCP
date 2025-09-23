require "language/node"

class PoeMcp < Formula
  desc "PoE1-only MCP server with deterministic ETL and coverage tooling"
  homepage "https://github.com/<OWNER>/poe-mcp"
  url "https://github.com/<OWNER>/poe-mcp/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_SHA256"
  license "Apache-2.0"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/poe-mcp", "--help"
  end
end
