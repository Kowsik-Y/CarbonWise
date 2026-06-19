import { test, expect } from "@playwright/test";

test.describe("CarbonWise E2E Flow", () => {
  const testEmail = `e2e-user-${Date.now()}@carbonwise.test`;
  const testPassword = "password123";

  test("Should complete user journey from signup to logout", async ({ page }) => {
    // 1. Visit homepage
    await page.goto("/");
    await expect(page.locator("text=CarbonWise").first()).toBeVisible();

    // 2. Go to registration
    await page.goto("/auth?mode=signup");
    await page.fill('input[placeholder="John Doe"]', "Green Warrior");
    await page.fill('input[placeholder="name@example.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    
    // Click submit
    await page.click('button[type="submit"]');

    // 3. Carbon Assessment Wizard should load (due to redirect on first login)
    await page.waitForURL("**/assessment");
    await expect(page.locator("text=Carbon Footprint Assessment")).toBeVisible();

    // Step 0: Transportation
    await page.fill('input[type="range"]', "15"); // commute km slider
    
    // Interacting with custom Select: transport-type
    await page.click("button#transport-type");
    await page.click('button[role="option"]:has-text("Electric Vehicle (EV)")');
    
    await page.click('button:has-text("Next")');

    // Step 1: Home Energy
    await page.fill('input#electricity-bill', "65"); // electricity bill
    await page.click('button:has-text("Next")');

    // Step 2: Diet
    await page.click("button#food-habits");
    await page.click('button[role="option"]:has-text("Vegetarian (Eggs/Dairy, no meat)")');
    
    await page.click('button:has-text("Next")');

    // Step 3: Shopping
    await page.click("button#shopping-habits");
    await page.click('button[role="option"]:has-text("Minimalist (Buy only essentials, recycle/secondhand first)")');
    
    await page.click('button:has-text("Next")');

    // Step 4: Waste
    await page.click("button#waste-habits");
    await page.click('button[role="option"]:has-text("Recycle & Compost everything possible")');
    
    // Click Calculate
    await page.click('button:has-text("Calculate Carbon Score")');

    // Success Screen
    await expect(page.locator("text=Calculation Complete!")).toBeVisible();
    await page.click('button:has-text("Go to Dashboard")');

    // 4. Dashboard rendering
    await page.waitForURL("**/dashboard");
    await expect(page.locator("text=Hello, Green Warrior!")).toBeVisible();
    await expect(page.locator("text=Sustainability Score").first()).toBeVisible();

    // 5. Goal Planning
    await page.goto("/goals");
    await expect(page.locator("text=Action Planner")).toBeVisible();

    // Add Goal from first AI recommended action
    const addGoalBtn = page.locator('button[title="Add to Goals"]').first();
    await expect(addGoalBtn).toBeVisible();
    await addGoalBtn.click();

    // Verify a goal is visible in active commitments
    await expect(page.locator('button[title="Mark as Completed"]').first()).toBeVisible();

    // 6. Challenge Completion
    await page.goto("/challenges");
    await expect(page.locator("text=Weekly AI Challenges")).toBeVisible();

    // Join first available challenge
    const joinBtn = page.locator('button:has-text("Join Challenge")').first();
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      // Complete it
      const completeBtn = page.locator('button:has-text("I Did This!")').first();
      await expect(completeBtn).toBeVisible();
      await completeBtn.click();
    }

    // 7. Simulator Usage
    await page.goto("/simulator");
    await expect(page.locator("text=Carbon Reduction Simulator")).toBeVisible();
    await page.fill('input#sim-commute', "50"); 
    
    // Interacting with custom Select in simulator
    await page.click("button#sim-food-habits");
    await page.click('button[role="option"]:has-text("Vegan")');

    // 8. AI Coach interaction
    await page.goto("/coach");
    await expect(page.locator('h1:has-text("AI Sustainability Coach")')).toBeVisible();
    
    // Type query
    await page.fill('input[placeholder*="Ask something"]', "How do I cut down energy bill?");
    await page.click('button[aria-label="Send message"]');
    
    // Wait for typing and response
    await page.waitForTimeout(1000); // short wait for mocked replies/API response
    
    // 9. Logout
    const logoutBtn = page.locator('button[aria-label="Logout"]');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL("**/");
    }
  });
});
