import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import crypto from "node:crypto";
import { fileURLToPath } from "url";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

function ensureCryptoHashCompat() {
  // Node 18 does not provide crypto.hash used by Vite 7 internals.
  const cryptoWithCompat = crypto as any;

  if (typeof cryptoWithCompat.hash === "function") {
    return;
  }

  cryptoWithCompat.hash = (algorithm: string, data: Buffer | string, outputEncoding: any = "hex") => {
    const hash = crypto.createHash(algorithm).update(data);
    if (outputEncoding === "buffer") {
      return hash.digest();
    }
    if (typeof outputEncoding === "string") {
      return hash.digest(outputEncoding as crypto.BinaryToTextEncoding);
    }
    return hash.digest("hex");
  };
}

export async function setupVite(app: Express, server: Server) {
  ensureCryptoHashCompat();
  const { createServer: createViteServer } = await import("vite");
  const { default: viteConfig } = await import("../../vite.config");

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        DIRNAME,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(DIRNAME, "../..", "dist", "public")
      : path.resolve(DIRNAME, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
