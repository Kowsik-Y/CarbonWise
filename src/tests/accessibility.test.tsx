// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";

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

  it("Dialog: should contain ARIA dialog attributes and role markup when open", () => {
    const { getByRole, getByLabelText, getByText } = render(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Title"
        description="Test Description"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    );

    // Verify role="dialog" is present
    const dialog = getByRole("dialog");
    expect(dialog).toBeDefined();

    // Verify aria-modal="true" is present
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // Verify aria-labelledby and aria-describedby points to title and description
    expect(dialog.getAttribute("aria-labelledby")).toBe("dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("dialog-description");

    // Verify title and description elements have correct IDs and contents
    const titleEl = getByText("Test Title");
    expect(titleEl.getAttribute("id")).toBe("dialog-title");

    const descEl = getByText("Test Description");
    expect(descEl.getAttribute("id")).toBe("dialog-description");

    // Verify aria-label="Close" is present on the close button
    const closeBtn = getByLabelText("Close");
    expect(closeBtn).toBeDefined();
  });

  it("Dialog: should focus the dialog container when opened and return focus to the trigger element when closed", () => {
    // Create trigger button and focus it
    const trigger = document.createElement("button");
    trigger.id = "trigger-btn";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Render Dialog open
    const { unmount, getByRole } = render(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Focus"
        description="Focus Description"
      />
    );

    // Verify dialog container has focus
    const dialogContainer = getByRole("dialog");
    expect(document.activeElement).toBe(dialogContainer);

    // Unmount Dialog
    unmount();

    // Verify focus is back to the trigger button
    expect(document.activeElement).toBe(trigger);

    // Clean up DOM
    document.body.removeChild(trigger);
  });

  it("Dialog: should trigger onClose when backdrop/overlay is clicked", () => {
    const handleClose = vi.fn();
    const { getByRole } = render(
      <Dialog
        isOpen={true}
        onClose={handleClose}
        title="Test Backdrop"
        description="Backdrop Description"
      />
    );

    const dialog = getByRole("dialog");
    const overlay = dialog.parentElement as HTMLElement;
    
    // Click the overlay
    fireEvent.click(overlay);

    expect(handleClose).toHaveBeenCalled();
  });

  it("Dialog: should call onConfirm if provided when confirm button is clicked", () => {
    const handleConfirm = vi.fn();
    const { getByText } = render(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Confirm"
        description="Confirm Description"
        confirmText="Yes"
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(getByText("Yes"));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it("Dialog: should call onClose when confirm button is clicked and no onConfirm is provided", () => {
    const handleClose = vi.fn();
    const { getByText } = render(
      <Dialog
        isOpen={true}
        onClose={handleClose}
        title="Test Confirm Close"
        description="Confirm Description"
        confirmText="OK"
      />
    );

    fireEvent.click(getByText("OK"));
    expect(handleClose).toHaveBeenCalled();
  });

  it("Dialog: should call onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <Dialog
        isOpen={true}
        onClose={handleClose}
        title="Test Escape"
        description="Escape Description"
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("Dialog: should render different variants correctly", () => {
    const { rerender, container } = render(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Variant"
        description="Variant Description"
        variant="success"
      />
    );
    expect(container.querySelector(".text-brand")).toBeDefined();

    rerender(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Variant"
        description="Variant Description"
        variant="error"
      />
    );
    expect(container.querySelector(".text-red-500")).toBeDefined();

    rerender(
      <Dialog
        isOpen={true}
        onClose={() => {}}
        title="Test Variant"
        description="Variant Description"
        variant="warning"
      />
    );
    expect(container.querySelector(".text-yellow-500")).toBeDefined();
  });
});
