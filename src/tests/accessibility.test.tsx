// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// Extend expect with toHaveNoViolations from jest-axe
expect.extend(toHaveNoViolations);

describe("Component Accessibility Audits (Axe-Core)", () => {
  it("Button: should have no violations", async () => {
    const { container } = render(
      <Button variant="primary" size="md">
        Click Me
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Input: should associate labels and input elements for screen readers", async () => {
    const { container } = render(
      <Input 
        id="email-input" 
        label="Email Address" 
        placeholder="Enter your email" 
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Input: should contain valid ARIA reference when displaying errors", async () => {
    const { container } = render(
      <Input 
        id="password-input" 
        label="Password" 
        error="Password must be at least 6 characters" 
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify aria-invalid and aria-describedby linkage
    const input = container.querySelector("input");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.getAttribute("aria-describedby")).toBe("password-input-error");
  });

  it("Select: should comply with ARIA listbox requirements", async () => {
    const options = [
      { value: "vegan", label: "Vegan" },
      { value: "vegetarian", label: "Vegetarian" },
    ];
    const { container } = render(
      <Select 
        id="diet-select" 
        label="Dietary Habit" 
        options={options} 
        value="vegan" 
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Check button attributes
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-haspopup")).toBe("listbox");
    expect(button?.getAttribute("aria-controls")).toBe("diet-select-listbox");
  });
});
