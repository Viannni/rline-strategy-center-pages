import test from "node:test";
import assert from "node:assert/strict";
import { renderBarChart, renderLineChart } from "../views/rline-charts.js";

function rectAttribute(rect, name) {
  return Number(rect.match(new RegExp(`${name}="([^"]+)"`))?.[1]);
}

test("percentage bars grow upward as the value increases", () => {
  const html = renderBarChart({
    title: "百分比对比",
    subtitle: "测试",
    labels: ["25%", "75%"],
    datasets: [{ label: "实际", data: [25, 75], color: "#4d8fe3" }],
    yMax: 100,
    unit: "%"
  });
  const rects = [...html.matchAll(/<rect[^>]+>/g)].map((match) => match[0]);
  const low = rects[0];
  const high = rects[1];

  assert.ok(rectAttribute(high, "y") < rectAttribute(low, "y"));
  assert.ok(rectAttribute(high, "height") > rectAttribute(low, "height"));
});

 
test("line charts can show exact values on every non-missing point", () => {
  const html = renderLineChart({
    title: "首周留存",
    subtitle: "实际 vs 目标",
    labels: ["D1", "D2", "D3"],
    datasets: [
      { label: "实际", data: [34.26, 30.98, null], color: "#16795a" },
      { label: "目标", data: [72, 68, 65], color: "#16795a", dashed: true }
    ],
    yMax: 100,
    unit: "%",
    decimals: 2,
    showValues: true
  });

  assert.equal((html.match(/class="rline-chart-value-label/g) || []).length, 5);
  assert.match(html, /34\.26%<\/text>/);
  assert.match(html, /30\.98%<\/text>/);
  assert.match(html, /72\.00%<\/text>/);
  assert.doesNotMatch(html, />-<\/text>/);
});


test("bar charts can show exact values above every non-missing bar", () => {
  const html = renderBarChart({
    title: "QA数量",
    subtitle: "分类",
    labels: ["用户QA", "课程QA"],
    datasets: [{ label: "问题数", data: [3, 5], color: "#4d8fe3" }],
    yMax: 5,
    unit: "条",
    decimals: 0,
    showValues: true
  });

  assert.equal((html.match(/class="rline-chart-bar-value/g) || []).length, 2);
  assert.match(html, /3条<\/text>/);
  assert.match(html, /5条<\/text>/);
});
