import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "~/test/test-utils";
import ImageCarousel from "~/app/_components/image-carousel";
import LanguageSwitcher from "~/components/ui/language-switcher";
import EquipmentCategoryFilter from "~/app/_components/equipment-category-filter";
import type { EquipmentCategory } from "~/types";

// next/image needs the Next runtime for its loader; a plain <img> is enough here
vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    quality: _quality,
    blurDataURL: _blur,
    placeholder: _placeholder,
    ...props
  }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  ),
}));

// jsdom has no PointerEvent; motion's whileTap fires one on keyboard Enter
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

const IMAGES = ["/a.jpg", "/b.jpg", "/c.jpg"];

describe("ImageCarousel lightbox keyboard access", () => {
  it("opens the lightbox with Enter and moves focus into the dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImageCarousel images={IMAGES} alt="Hljómskálagarður" />);

    const slide = screen.getByRole("button", { name: "View image 1 of 3" });
    slide.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "Hljómskálagarður" });
    const close = within(dialog).getByRole("button", { name: "Close image viewer" });
    expect(close).toHaveFocus();
  });

  it("opens the lightbox with Space", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImageCarousel images={IMAGES} alt="Klambratún" />);

    screen.getByRole("button", { name: "View image 1 of 3" }).focus();
    await user.keyboard(" ");

    expect(await screen.findByRole("dialog", { name: "Klambratún" })).toBeInTheDocument();
  });

  it("hides background content while open, traps Tab, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <ImageCarousel images={IMAGES} alt="Laugardalur" />,
    );

    const slide = screen.getByRole("button", { name: "View image 1 of 3" });
    slide.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Laugardalur" });

    // Background is removed from the accessibility tree and made inert
    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveAttribute("inert");

    // Tabbing cycles inside the dialog only
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(container).not.toHaveAttribute("inert");
    expect(slide).toHaveFocus();
  });

  it("only exposes the visible slide to keyboard and AT", () => {
    renderWithProviders(<ImageCarousel images={IMAGES} alt="Test" />);
    // Off-screen slides are aria-hidden, so only one slide button is reachable
    expect(screen.getAllByRole("button", { name: /^View image/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Previous image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to image 1" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});

describe("accessible names on key controls", () => {
  it("language switcher trigger has a localized name", () => {
    renderWithProviders(<LanguageSwitcher />);
    expect(
      screen.getByRole("button", { name: /^Change language \(.+\)$/ }),
    ).toBeInTheDocument();
  });

  it("equipment filter pills are toggle buttons in a labelled group", async () => {
    const user = userEvent.setup();
    const onToggleCategory = vi.fn();
    const counts = new Map<EquipmentCategory, number>([["toddler_friendly", 4]]);

    renderWithProviders(
      <EquipmentCategoryFilter
        activeCategories={new Set<EquipmentCategory>(["toddler_friendly"])}
        onToggleCategory={onToggleCategory}
        bouncyPillowActive={false}
        onToggleBouncyPillow={vi.fn()}
        bouncyPillowCount={2}
        footballFieldActive={false}
        onToggleFootballField={vi.fn()}
        footballFieldCount={0}
        openNowActive={false}
        onToggleOpenNow={vi.fn()}
        closedSchoolGroundCount={0}
        onClearAll={vi.fn()}
        categoryCounts={counts}
      />,
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAccessibleName();

    const pressed = within(group)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAttribute("type", "button");

    pressed[0]!.focus();
    await user.keyboard("{Enter}");
    expect(onToggleCategory).toHaveBeenCalledWith("toddler_friendly");
  });
});
