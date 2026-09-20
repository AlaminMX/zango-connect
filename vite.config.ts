import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    cors: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: {
    "process.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "https://pozputxlgfbqywlvxfot.supabase.co",
    ),
    "process.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvenB1dHhsZ2ZicXl3bHZ4Zm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTY4NjIsImV4cCI6MjA5NTEzMjg2Mn0.dRs7lB5JaY2hgRN_y63rw4JHWgYV6XVYXaLANTFOFso",
    ),
  },
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart(), mcpPlugin(), viteReact()],
});
