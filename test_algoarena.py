import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# --- Configuration ---
BASE_URL = "http://localhost:3000"
TEST_USER = "testuser_selenium"
TEST_PASS = "password123"

def setup_driver():
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Uncomment for headless testing
    chrome_options.add_argument("--window-size=1920,1080")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def test_algo_arena():
    driver = setup_driver()
    wait = WebDriverWait(driver, 10)

    try:
        print(f"--- Starting Selenium Test for AlgoArena ---")
        
        # 1. Register/Login Page
        driver.get(f"{BASE_URL}/login")
        print(f"Navigated to: {driver.current_url}")

        # Check for 'Sign Up' link to toggle to registration
        try:
            signup_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='Sign Up']")))
            signup_link.click()
            print("Switched to Registration mode.")
        except:
            print("Already in Registration mode or toggle not found.")

        # Fill Registration
        inputs = driver.find_elements(By.TAG_NAME, "input")
        inputs[0].send_keys(TEST_USER)
        inputs[1].send_keys(TEST_PASS)
        
        submit_btn = driver.find_element(By.TAG_NAME, "button")
        submit_btn.click()
        print(f"Clicked Register for user: {TEST_USER}")

        # After registration, it should ask to login (based on your code logic)
        time.sleep(1) 
        
        # Now Login
        print("Attempting to Login...")
        inputs = wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))
        inputs[0].clear()
        inputs[0].send_keys(TEST_USER)
        inputs[1].clear()
        inputs[1].send_keys(TEST_PASS)
        
        # Click login button (it changes text based on state)
        login_btn = driver.find_element(By.TAG_NAME, "button")
        login_btn.click()

        # 2. Dashboard Page
        print("Waiting for Dashboard...")
        wait.until(EC.url_contains("/dashboard"))
        print(f"Logged in successfully. Current URL: {driver.current_url}")

        # Verify problem list is visible
        problems = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//h3")))
        print(f"Found {len(problems)} problems on dashboard.")
        
        # Select the first problem (e.g., Two Sum)
        first_problem = problems[0]
        problem_title = first_problem.text
        print(f"Selecting problem: {problem_title}")
        first_problem.click()

        # 3. Code Arena (Editor Page)
        print("Navigating to Arena...")
        wait.until(EC.url_to_be(f"{BASE_URL}/?problem=two_sum")) # Default slug logic
        
        # Check if editor is loaded
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "monaco-editor")))
        print("Monaco Editor loaded successfully.")

        # 4. Execute Code
        run_button = driver.find_element(By.CLASS_NAME, "btn-run.primary")
        print("Clicking 'Run' button...")
        run_button.click()

        # Wait for results
        status_text = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "status-text")))
        print(f"Execution Status: {status_text.text}")

        # 5. AI Sidebar Check
        ai_input = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
        print("AI Sidebar is interactive.")
        
        # Final Screenshot
        driver.save_screenshot("algoarena_test_final.png")
        print("Test completed successfully. Screenshot saved.")

    except Exception as e:
        print(f"❌ Test Failed: {e}")
        driver.save_screenshot("test_error.png")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_algo_arena()
