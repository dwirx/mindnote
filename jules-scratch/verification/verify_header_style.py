from playwright.sync_api import sync_playwright, Page, expect

def verify_compact_header(page: Page):
    """
    This script verifies the header has been made more compact.
    1. Navigates to the app running on the preview server.
    2. Creates a new note to make the editor header visible.
    3. Takes a screenshot of the editor area, focusing on the header.
    """
    # 1. Navigate to the app
    # The preview server runs on port 4173 by default.
    page.goto("http://localhost:4173")

    # 2. Create a new note
    new_note_button = page.get_by_role("button", name="New Note")
    expect(new_note_button).to_be_visible()
    new_note_button.click()

    # Wait for the editor to be ready
    editor_header = page.locator(".editor-header")
    expect(editor_header).to_be_visible()

    # 3. Take a screenshot of the compact header
    page.screenshot(path="jules-scratch/verification/compact_header.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_compact_header(page)
        browser.close()

if __name__ == "__main__":
    main()