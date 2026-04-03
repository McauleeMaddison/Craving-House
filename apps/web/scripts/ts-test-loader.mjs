import { readFile } from "node:fs/promises";

import ts from "typescript";

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true
};

export async function load(url, context, nextLoad) {
  if (!url.endsWith(".ts") && !url.endsWith(".tsx")) {
    return nextLoad(url, context);
  }

  const source = await readFile(new URL(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions,
    fileName: new URL(url).pathname
  });

  return {
    format: "module",
    shortCircuit: true,
    source: outputText
  };
}
