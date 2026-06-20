// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "@/components/ui/select";

describe("Select Component Keyboard and Click Interactions", () => {
  const options = [
    { value: "ev", label: "Electric Vehicle" },
    { value: "petrol", label: "Petrol Car" },
    { value: "transit", label: "Public Transit" },
  ];

  it("should open and close on click", () => {
    const onChange = vi.fn();
    render(<Select id="test-select" label="Vehicle" options={options} value="ev" onChange={onChange} />);

    const button = screen.getByRole("button", { name: "Vehicle" });
    expect(button).toBeDefined();
    
    // Dropdown should be closed initially
    expect(screen.queryByRole("listbox")).toBeNull();

    // Click to open
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeDefined();

    // Click option to select and close
    const option = screen.getByRole("option", { name: "Petrol Car" });
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith({ target: { value: "petrol" } });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("should handle Enter, Space, Escape and Arrow keys", () => {
    const onChange = vi.fn();
    render(<Select id="test-select" label="Vehicle" options={options} value="ev" onChange={onChange} />);

    const button = screen.getByRole("button", { name: "Vehicle" });
    
    // Space to open
    fireEvent.keyDown(button, { key: " " });
    expect(screen.getByRole("listbox")).toBeDefined();

    // Escape to close
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();

    // Enter to open
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeDefined();

    // ArrowDown to select next (petrol)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith({ target: { value: "petrol" } });
    expect(screen.queryByRole("listbox")).toBeNull();

    // Reopen dropdown
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeDefined();

    // ArrowUp to select previous from ev (transit)
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith({ target: { value: "transit" } });
  });

  it("should close on click outside", () => {
    render(<Select id="test-select" label="Vehicle" options={options} value="ev" />);
    const button = screen.getByRole("button", { name: "Vehicle" });

    // Click to open
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeDefined();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
