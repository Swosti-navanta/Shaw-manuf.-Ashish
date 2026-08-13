import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits bottom-left, exactly where the SideNav user block
  // (and the profile / persona switcher it opens) lives. Off, so the persona
  // switch stays clickable while demoing.
  devIndicators: false,
};

export default nextConfig;
