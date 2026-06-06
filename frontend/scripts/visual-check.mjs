import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = path.join(os.tmpdir(), "hanoi-home-value-qa");
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

async function inspectCanvas(page) {
  return page.locator("canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const gl =
      canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
      canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
      return { width: rect.width, height: rect.height, webgl: false, coloredPixels: 0 };
    }

    const sampleWidth = Math.min(64, canvas.width);
    const sampleHeight = Math.min(64, canvas.height);
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    gl.readPixels(
      Math.max(0, Math.floor(canvas.width / 2 - sampleWidth / 2)),
      Math.max(0, Math.floor(canvas.height / 2 - sampleHeight / 2)),
      sampleWidth,
      sampleHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    let coloredPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const spread =
        Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) -
        Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
      if (spread > 5 || pixels[index] < 210) coloredPixels += 1;
    }

    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      bufferScale: Number((canvas.width / Math.max(rect.width, 1)).toFixed(2)),
      webgl: true,
      coloredPixels,
    };
  });
}

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
  await page.getByRole("heading", { name: "Dự đoán giá nhà Hà Nội", exact: true }).waitFor();
  await page.waitForTimeout(700);
  const landingCanvas = await inspectCanvas(page);
  const heroPath = path.join(outputDir, "desktop-landing-hero.png");
  await page.screenshot({ path: heroPath, fullPage: false });

  await page.getByRole("button", { name: "Phân tích ngôi nhà mẫu" }).click();
  await page.waitForTimeout(800);
  const analyzingPhase = await page.locator(".interactive-property-demo").getAttribute("data-phase");
  const analyzingPath = path.join(outputDir, "desktop-object-analyzing.png");
  await page.screenshot({ path: analyzingPath, fullPage: false });
  await page.locator(".interactive-result").getByText("20,32 tỷ VNĐ", { exact: true }).waitFor({ timeout: 5000 });
  const resultPhase = await page.locator(".interactive-property-demo").getAttribute("data-phase");
  const floatingCardCount = await page.locator(".demo-floating-card").count();
  const resultPath = path.join(outputDir, "desktop-object-result.png");
  await page.screenshot({ path: resultPath, fullPage: false });

  await page.getByRole("button", { name: "Xem cách hoạt động" }).click();
  await page.getByRole("heading", {
    name: "Từ thông tin căn nhà đến kết quả định giá có căn cứ.",
  }).waitFor();
  await page.locator("#live-demo").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const demoPath = path.join(outputDir, "desktop-live-demo.png");
  await page.screenshot({ path: demoPath, fullPage: false });
  const demoStepCount = await page.locator(".demo-step").count();

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
    .filter({ hasText: "Khoảng ước tính model" })
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

  const comparablesTab = page.getByRole("tab", { name: "Listing tương tự" });
  await comparablesTab.click();
  await page.waitForTimeout(350);
  const comparableRowCount = await page.locator(".table-panel tbody tr").count();

  const dealTab = page.getByRole("tab", { name: "Phân tích giao dịch" });
  await dealTab.click();
  await page.getByLabel("Giá đang chào").fill("9");
  const analysisResponse = page.waitForResponse(
    (response) => response.url().includes("/api/analysis") && response.status() === 200,
  );
  await page.getByRole("button", { name: "Phân tích giao dịch" }).click();
  await analysisResponse;
  await page.locator(".score-ring strong").waitFor();
  const dealScoreText = await page.locator(".score-ring strong").innerText();
  const dealPath = path.join(outputDir, "desktop-deal-analysis.png");
  await page.screenshot({ path: dealPath, fullPage: false });

  results.desktop = {
    landingCanvas,
    heroPath,
    analyzingPath,
    resultPath,
    demoPath,
    dashboardPath,
    dealPath,
    demoStepCount,
    analyzingPhase,
    resultPhase,
    floatingCardCount,
    errorBannerCount,
    confidenceCardText,
    wardOptionCount,
    computedDepthText,
    comparableRowCount,
    dealScoreText,
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
  await page.getByRole("heading", { name: "Dự đoán giá nhà Hà Nội", exact: true }).waitFor();
  await page.waitForTimeout(900);
  const landingPath = path.join(outputDir, "mobile-landing.png");
  await page.screenshot({ path: landingPath, fullPage: false });
  const landingCanvas = await inspectCanvas(page);
  const landingOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await page.getByRole("button", { name: "Phân tích ngôi nhà mẫu" }).click();
  await page.locator(".interactive-result").getByText("20,32 tỷ VNĐ", { exact: true }).waitFor({ timeout: 5000 });
  const mobileResultVisible = await page
    .locator(".interactive-result")
    .getByText("Dự đoán giá nhà", { exact: true })
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
    landingCanvas,
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
  results.desktop.landingCanvas?.webgl !== true ||
  results.desktop.landingCanvas?.coloredPixels < 50 ||
  results.desktop.landingCanvas?.bufferScale > 1.3 ||
  results.desktop.demoStepCount !== 5 ||
  results.desktop.analyzingPhase !== "analyzing" ||
  results.desktop.resultPhase !== "result" ||
  results.desktop.floatingCardCount !== 3 ||
  results.desktop.errorBannerCount !== 0 ||
  !results.desktop.confidenceCardText?.includes("Validation MAE") ||
  results.desktop.wardOptionCount < 2 ||
  results.desktop.computedDepthText !== "12.0 m" ||
  results.desktop.comparableRowCount < 1 ||
  Number(results.desktop.dealScoreText) < 1 ||
  results.mobile.landingCanvas?.webgl !== true ||
  results.mobile.landingCanvas?.coloredPixels < 50 ||
  results.mobile.landingCanvas?.bufferScale > 1.3 ||
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
