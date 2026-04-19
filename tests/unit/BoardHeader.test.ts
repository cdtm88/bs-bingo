import { describe, it, expect, afterEach } from "vitest";
import { mount, unmount } from "svelte";
import BoardHeader from "../../src/lib/components/BoardHeader.svelte";

let instance: ReturnType<typeof mount> | null = null;
let container: HTMLElement | null = null;

function renderHeader(props: { gridSize: 3 | 4 | 5 }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  instance = mount(BoardHeader, { target: container, props });
  return container;
}

afterEach(() => {
  if (instance) {
    unmount(instance);
    instance = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("BoardHeader", () => {
  it("renders B U L L S for gridSize=5", () => {
    const c = renderHeader({ gridSize: 5 });
    const letters = Array.from(c.querySelectorAll("[data-header-letter]")).map(
      (el) => el.textContent?.trim()
    );
    expect(letters).toEqual(["B", "U", "L", "L", "S"]);
  });

  it("renders B U L L for gridSize=4", () => {
    const c = renderHeader({ gridSize: 4 });
    const letters = Array.from(c.querySelectorAll("[data-header-letter]")).map(
      (el) => el.textContent?.trim()
    );
    expect(letters).toEqual(["B", "U", "L", "L"]);
  });

  it("renders B L S for gridSize=3", () => {
    const c = renderHeader({ gridSize: 3 });
    const letters = Array.from(c.querySelectorAll("[data-header-letter]")).map(
      (el) => el.textContent?.trim()
    );
    expect(letters).toEqual(["B", "L", "S"]);
  });
});
