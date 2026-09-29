import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

const publishedWorkbench = new URL("../rline-workbench/", import.meta.url);

test("published R-line workbench is self-contained inside the GitHub Pages repository", async () => {
  const indexUrl = new URL("index.html", publishedWorkbench);
  const appUrl = new URL("app.js", publishedWorkbench);
  const stylesUrl = new URL("styles.css", publishedWorkbench);
  const baseStylesUrl = new URL("base-styles.css", publishedWorkbench);
  const snapshotUrl = new URL("data/rline-live-snapshot.json", publishedWorkbench);
  const viewUrl = new URL("modules/views/rline-daily.js", publishedWorkbench);
  const dataUrl = new URL("modules/data/rline-daily-data.js", publishedWorkbench);
  const historyUrl = new URL("modules/history.js", publishedWorkbench);

  await Promise.all([indexUrl, appUrl, stylesUrl, baseStylesUrl, snapshotUrl, viewUrl, dataUrl, historyUrl].map((url) => access(url)));

  const [index, app] = await Promise.all([readFile(indexUrl, "utf8"), readFile(appUrl, "utf8")]);
  assert.match(index, /R线运营策略工作台/);
  assert.doesNotMatch(index, /\.\.\/rline-strategy-center-pages\//);
  assert.match(index, /base-styles\.css/);
  assert.doesNotMatch(app, /\.\.\/rline-strategy-center-pages\//);
  assert.match(app, /\.\/modules\/views\/rline-daily\.js/);
});
