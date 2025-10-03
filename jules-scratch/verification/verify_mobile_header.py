from playwright.sync_api import sync_playwright, Page, expect

def verify_mobile_header(page: Page):
    """
    This script verifies the mobile header has been made more compact.
    1. Sets the viewport to a mobile size.
    2. Navigates to the app running on the preview server.
    3. Creates a new note to make the editor header visible.
    4. Takes a screenshot of the editor area, focusing on the header.
    """
    # 1. Set viewport for mobile
    page.set_viewport_size({"width": 375, "height": 667}) # iPhone 8 size

    # 2. Navigate to the app
    page.goto("http://localhost:4173")

    # 3. Create a new note to show the editor header
    # On mobile, the FAB button is used to create a new note.
    new_note_button = page.locator(".fab")
    expect(new_note_button).to_be_visible()
    new_note_button.click()

    # Wait for the editor to be ready
    editor_header = page.locator(".editor-header")
    expect(editor_header).to_be_visible()

    # 4. Take a screenshot of the compact mobile header
    page.screenshot(path="jules-scratch/verification/compact_mobile_header.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_mobile_header(page)
        browser.close()

if __name__ == "__main__":
    main()