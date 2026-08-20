import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits bottom-left, exactly where the SideNav user block
  // (and the profile / persona switcher it opens) lives. Off, so the persona
  // switch stays clickable while demoing.
  devIndicators: false,

  // Azure App Service runs a prebuilt artifact — it never installs from
  // GitHub Packages, so the private registry token is a CI-only concern.
  // Standalone emits its own server plus a pruned node_modules.
  output: "standalone",
};

export default nextConfig;
