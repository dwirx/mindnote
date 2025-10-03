from playwright.sync_api import sync_playwright, Page, expect

def verify_markdown_preview(page: Page):
    """
    This script verifies the Markdown preview feature.
    1. Navigates to the app.
    2. Creates a new note.
    3. Enters Markdown content into the textarea.
    4. Clicks the preview button.
    5. Takes a screenshot of the rendered Markdown.
    """
    # 1. Navigate to the app
    page.goto("http://localhost:4173")

    # 2. Create a new note
    # Click the button to create a new note (assuming there's a button for it)
    # The FAB is only on mobile, so let's find a more general button.
    # Looking at `Sidebar.svelte`, there's a "New Note" button.
    new_note_button = page.get_by_role("button", name="New Note")
    expect(new_note_button).to_be_visible()
    new_note_button.click()

    # Wait for the new note to be created and loaded in the editor
    expect(page.locator(".title-input")).to_have_value("New Note")

    # 3. Enter Markdown content
    content_textarea = page.locator(".content-textarea")
    expect(content_textarea).to_be_visible()
    markdown_content = """
# This is a heading
## This is a subheading

- List item 1
- List item 2

`This is some inline code.`

```python
def hello_world():
    print("Hello, from a code block!")
```
"""
    content_textarea.fill(markdown_content)

    # 4. Click the preview button
    preview_button = page.get_by_title("Preview mode")
    expect(preview_button).to_be_visible()
    preview_button.click()

    # 5. Assert that the preview is visible and take a screenshot
    markdown_preview = page.locator(".markdown-preview")
    expect(markdown_preview).to_be_visible()

    # Check for specific rendered elements
    expect(markdown_preview.get_by_role("heading", name="This is a heading")).to_be_visible()
    expect(markdown_preview.locator("code")).to_contain_text('hello_world')

    page.screenshot(path="jules-scratch/verification/markdown_preview.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_markdown_preview(page)
        browser.close()

if __name__ == "__main__":
    main()