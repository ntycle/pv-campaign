import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase SDK is client-only; prevent Next.js from trying to bundle it
  // on the server during static prerendering (avoids auth/invalid-api-key).
  serverExternalPackages: ["firebase", "firebase/app", "firebase/auth", "firebase/firestore"],
};

export default nextConfig;
