from playwright.sync_api import Page, expect, sync_playwright

def test_filtered_feed(page: Page):
    print("Navigating to filtered feed...")
    # 1. Arrange: Go to the homepage with a filter that matches nothing
    page.goto("http://localhost:3000/?filter=Bob")

    print("Checking for no results message...")
    # 2. Assert: Expect to see the "No tweets match" message
    # We look for the text we added.
    no_results = page.get_by_text("No tweets match your filters.")
    expect(no_results).to_be_visible()

    print("Taking screenshot...")
    # 3. Screenshot
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_filtered_feed(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()
