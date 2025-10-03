from playwright.sync_api import sync_playwright, Page, expect

def verify_desktop_modes(page: Page):
    """
    Verifies the desktop preview modes: edit -> split -> preview.
    """
    print("Verifying desktop modes...")
    page.goto("http://localhost:4173")

    # Create a note
    page.get_by_role("button", name="New Note").click()
    expect(page.locator(".editor-header")).to_be_visible()
    page.locator(".content-textarea").fill("# Hello World\n\nThis is a test.")

    # 1. Cycle to Split View
    preview_button = page.get_by_title("Split view")
    preview_button.click()
    expect(page.locator(".editor-content.split-view")).to_be_visible()
    print("Taking screenshot of split view...")
    page.screenshot(path="jules-scratch/verification/desktop_split_view.png")

    # 2. Cycle to Preview-Only View
    preview_button = page.get_by_title("Preview-only view")
    preview_button.click()
    expect(page.locator(".markdown-preview-wrapper")).to_be_visible()
    expect(page.locator(".content-textarea")).not_to_be_visible()
    print("Taking screenshot of preview-only view...")
    page.screenshot(path="jules-scratch/verification/desktop_preview_only_view.png")

def verify_mobile_mode(page: Page):
    """
    Verifies the mobile preview toggle: edit -> preview.
    """
    print("\nVerifying mobile mode...")
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://localhost:4173")

    # Create a note using the FAB
    page.locator(".fab").click()
    expect(page.locator(".editor-header")).to_be_visible()
    page.locator(".content-textarea").fill("## Mobile Test\n\n- Item 1\n- Item 2")

    # 1. Toggle to Preview View
    preview_button = page.get_by_title("Preview mode")
    preview_button.click()
    expect(page.locator(".markdown-preview-wrapper")).to_be_visible()
    expect(page.locator(".content-textarea")).not_to_be_visible()
    print("Taking screenshot of mobile preview...")
    page.screenshot(path="jules-scratch/verification/mobile_preview_view.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        verify_desktop_modes(page)
        verify_mobile_mode(page)

        browser.close()
    print("\nVerification script finished successfully.")

if __name__ == "__main__":
    main()