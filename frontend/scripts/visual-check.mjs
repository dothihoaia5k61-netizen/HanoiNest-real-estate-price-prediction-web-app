import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = path.join(os.tmpdir(), "hanoi-nest-qa");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

const results = {
  outputDir,
  desktop: {},
  mobile: {},
  consoleErrors: [],
  pageErrors: [],
};

function captureErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));
}

async function runDesktop() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  captureErrors(page);

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "HanoiNest", exact: true }).waitFor();
  await page.waitForTimeout(1400);
  const heroPath = path.join(outputDir, "desktop-landing-hero.png");
  await page.screenshot({ path: heroPath, fullPage: false });

  await page.getByRole("button", { name: "Phân tích bất động sản mẫu" }).click();
  await page.waitForTimeout(120);
  const analyzingPhase = await page.locator(".editorial-demo").getAttribute("data-phase");
  const analyzingPath = path.join(outputDir, "desktop-editorial-analyzing.png");
  await page.screenshot({ path: analyzingPath, fullPage: false });
  await page.locator(".analysis-result").getByText("20,32 tỷ VNĐ", { exact: true }).waitFor({ timeout: 5000 });
  const resultPhase = await page.locator(".editorial-demo").getAttribute("data-phase");
  const factCount = await page.locator(".analysis-facts > span").count();
  const resultPath = path.join(outputDir, "desktop-editorial-result.png");
  await page.screenshot({ path: resultPath, fullPage: false });

  await page.getByRole("button", { name: "Xem cách hoạt động" }).click();
  await page.locator("#live-demo").getByRole("heading", {
    name: "Biến thông tin bất động sản thành phân tích giá trị có cơ sở dữ liệu.",
  }).waitFor();
  await page.locator("#live-demo").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const demoPath = path.join(outputDir, "desktop-live-demo.png");
  await page.screenshot({ path: demoPath, fullPage: false });
  const demoStepCount = await page.locator(".demo-step").count();

  await page.locator("#technology").scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  const featurePath = path.join(outputDir, "desktop-editorial-features.png");
  await page.screenshot({ path: featurePath, fullPage: false });
  const featureCount = await page.locator(".feature-grid article").count();

  await page.locator(".landing-cta").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const ctaPath = path.join(outputDir, "desktop-editorial-cta.png");
  await page.screenshot({ path: ctaPath, fullPage: false });

  await page.goto("http://127.0.0.1:5173/dashboard", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Phân tích định giá" }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".intro-value strong")?.textContent?.includes("Đang"),
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(600);

  const dashboardPath = path.join(outputDir, "desktop-dashboard.png");
  await page.screenshot({ path: dashboardPath, fullPage: false });
  const errorBannerCount = await page.locator(".error-banner").count();
  const confidenceCardText = await page
    .locator(".premium-metric")
    .filter({ hasText: "Khoảng giá ước tính từ mô hình" })
    .innerText();

  const locationResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/metadata/locations") && response.status() === 200,
  );
  await page.getByLabel("Quận/Huyện").selectOption({ label: "Ba Đình" });
  await locationResponse;
  const wardOptionCount = await page.getByLabel("Phường/Xã").locator("option").count();

  await page.getByLabel("Diện tích", { exact: true }).fill("60");
  await page.getByLabel("Mặt tiền").selectOption("5");
  const computedDepthText = await page.locator(".computed-field strong").innerText();

  const comparablesTab = page.getByRole("tab", { name: "BĐS đối chiếu" });
  await comparablesTab.click();
  await page.waitForTimeout(350);
  const comparableRowCount = await page.locator(".table-panel tbody tr").count();

  const dealTab = page.getByRole("tab", { name: "Phân tích giao dịch" });
  await dealTab.click();
  await page.getByLabel("Đơn vị giá đang chào").selectOption("million");
  await page.getByLabel("Giá đang chào", { exact: true }).fill("9000");
  await page.waitForFunction(
    () => !document.querySelector(".deal-action")?.hasAttribute("disabled"),
  );
  const analysisResponse = page.waitForResponse(
    (response) => response.url().includes("/api/analysis") && response.status() === 200,
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Phân tích giao dịch" }).click();
  await analysisResponse;
  await page.locator(".score-ring strong").waitFor();
  const dealScoreText = await page.locator(".score-ring strong").innerText();
  const dealDeltaText = await page.locator(".deal-deltas").innerText();
  const dealPath = path.join(outputDir, "desktop-deal-analysis.png");
  await page.screenshot({ path: dealPath, fullPage: false });

  results.desktop = {
    heroPath,
    analyzingPath,
    resultPath,
    demoPath,
    featurePath,
    ctaPath,
    dashboardPath,
    dealPath,
    demoStepCount,
    featureCount,
    analyzingPhase,
    resultPhase,
    factCount,
    errorBannerCount,
    confidenceCardText,
    wardOptionCount,
    computedDepthText,
    comparableRowCount,
    dealScoreText,
    dealDeltaText,
  };
  await context.close();
}

async function runMobile() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const page = await context.newPage();
  captureErrors(page);

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "HanoiNest", exact: true }).waitFor();
  await page.waitForTimeout(900);
  const landingPath = path.join(outputDir, "mobile-landing.png");
  await page.screenshot({ path: landingPath, fullPage: false });
  const landingOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await page.getByRole("button", { name: "Phân tích bất động sản mẫu" }).click();
  await page.locator(".analysis-result").getByText("20,32 tỷ VNĐ", { exact: true }).waitFor({ timeout: 5000 });
  const mobileResultVisible = await page
    .locator(".analysis-result")
    .getByText("Giá trị dự đoán", { exact: true })
    .isVisible();

  await page.goto("http://127.0.0.1:5173/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const dashboardPath = path.join(outputDir, "mobile-dashboard.png");
  await page.screenshot({ path: dashboardPath, fullPage: false });
  const dashboardOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  results.mobile = {
    landingPath,
    dashboardPath,
    landingOverflow,
    mobileResultVisible,
    dashboardOverflow,
  };
  await context.close();
}

try {
  await runDesktop();
  await runMobile();
} finally {
  await browser.close();
}

if (
  results.desktop.demoStepCount !== 5 ||
  results.desktop.featureCount !== 4 ||
  results.desktop.analyzingPhase !== "analyzing" ||
  results.desktop.resultPhase !== "result" ||
  results.desktop.factCount !== 3 ||
  results.desktop.errorBannerCount !== 0 ||
  !results.desktop.confidenceCardText?.includes("Validation MAE") ||
  results.desktop.wardOptionCount < 2 ||
  results.desktop.computedDepthText !== "12.0 m" ||
  results.desktop.comparableRowCount < 1 ||
  Number(results.desktop.dealScoreText) < 1 ||
  !results.desktop.dealDeltaText?.includes("%") ||
  results.mobile.mobileResultVisible !== true ||
  results.mobile.landingOverflow > 1 ||
  results.mobile.dashboardOverflow > 1 ||
  results.consoleErrors.length > 0 ||
  results.pageErrors.length > 0
) {
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(results, null, 2));
