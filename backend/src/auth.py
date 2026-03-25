"""XPath-based login; step_delay before actions; wait for return to Kalshi."""
import logging
import sys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import ElementClickInterceptedException

import config
import utils
import state

LOG = logging.getLogger(__name__)

LOGIN_BUTTON_XPATH = "//a[contains(@href,'sign-in')] | //button[contains(.,'Log in') or contains(.,'Sign in')]"
EMAIL_XPATH = "//input[@type='email']"
PASSWORD_XPATH = "//input[@type='password']"
# Form-scoped so we don't click the header "Log in" (which can be covered by z-modal).
SUBMIT_XPATH = "//form[.//input[@type='email']]//button[@type='submit'] | //form[.//input[@type='email']]//button[contains(.,'Log in') or contains(.,'Sign in')]"
WAIT_TIMEOUT = 60
# URL path fragments that mean user is still on verification (not yet "returned to Kalshi")
VERIFICATION_PATH_FRAGMENTS = ("verify", "verification", "two-factor", "2fa", "otp")
# Specific path for the 2FA page where we prompt for PIN (must match to send request event)
SS_TWO_FACTOR_PATH = "ss-two-factor-code"
# Input for OTP/2FA code (SSE 2FA path)
VERIFICATION_INPUT_XPATH = (
    "//input[@type='text' and (contains(@name,'code') or contains(@name,'otp') or contains(@placeholder,'code') or contains(@placeholder,'verification'))]"
    " | //input[@inputmode='numeric']"
    " | //input[@type='text' and not(@name='email')]"
)
VERIFICATION_SUBMIT_XPATH = "//form//button[@type='submit'] | //button[contains(.,'Submit') or contains(.,'Verify')]"

def login(driver, stop_event=None) -> bool:
    """Perform email/password login via XPath. Returns True on success, False on failure. No raise."""
    try:
        wait = WebDriverWait(driver, WAIT_TIMEOUT)

        print("Clicking sign-in...", file=sys.stderr)
        utils.step_delay()
        login_btn = wait.until(EC.element_to_be_clickable((By.XPATH, LOGIN_BUTTON_XPATH)))
        login_btn.click()

        print("Filling email...", file=sys.stderr)
        email_el = wait.until(EC.visibility_of_element_located((By.XPATH, EMAIL_XPATH)))
        utils.step_delay()
        email_el.click()
        email_el.clear()
        email_el.send_keys(config.email)

        print("Filling password...", file=sys.stderr)
        password_el = wait.until(EC.element_to_be_clickable((By.XPATH, PASSWORD_XPATH)))
        utils.step_delay()
        password_el.click()
        password_el.clear()
        password_el.send_keys(config.password)

        print("Submitting login...", file=sys.stderr)
        utils.step_delay()
        # Do not dismiss overlay here: it closes the sign-in form and submit never navigates.
        submit_candidates = driver.find_elements(By.XPATH, SUBMIT_XPATH)
        if submit_candidates:
            submit_btn = submit_candidates[-1]
            wait.until(lambda d: submit_btn.is_displayed() and submit_btn.is_enabled())
        else:
            fallback_xpath = "//button[@type='submit'] | //button[contains(.,'Log in') or contains(.,'Sign in')]"
            submit_btn = wait.until(EC.element_to_be_clickable((By.XPATH, fallback_xpath)))
            fallback_all = driver.find_elements(By.XPATH, fallback_xpath)
            if len(fallback_all) > 1:
                submit_btn = fallback_all[-1]
        url_before_submit = driver.current_url or ""
        try:
            submit_btn.click()
        except ElementClickInterceptedException:
            driver.execute_script("arguments[0].click();", submit_btn)
        # Wait for navigation away from sign-in (e.g. to verification page) before waiting for "back on Kalshi".
        try:
            WebDriverWait(driver, 15).until(lambda d: (d.current_url or "") != url_before_submit)
        except Exception:
            pass

        seen_navigation_away = [False]  # True once we've left the pre-submit page (e.g. to verification)

        def returned_to_kalshi(drv):
            url = (drv.current_url or "").lower()
            if url != url_before_submit.lower() or any(f in url for f in VERIFICATION_PATH_FRAGMENTS):
                seen_navigation_away[0] = True
            on_main = "kalshi.com" in url and "sign-in" not in url and not any(f in url for f in VERIFICATION_PATH_FRAGMENTS)
            return seen_navigation_away[0] and on_main

        def on_verification_page(drv):
            url = (drv.current_url or "").lower()
            return any(f in url for f in VERIFICATION_PATH_FRAGMENTS)

        def on_ss_two_factor_page(drv):
            url = (drv.current_url or "").lower()
            return SS_TWO_FACTOR_PATH in url

        try:
            if WebDriverWait(driver, 10).until(on_ss_two_factor_page):
                WebDriverWait(driver, 10).until(
                    EC.visibility_of_element_located((By.XPATH, VERIFICATION_INPUT_XPATH))
                )
                print("Verification page detected; requesting code via SSE...", file=sys.stderr)
                code = state.request_user_input(
                    "Enter 2FA or verification code", field="code", stop_event=stop_event
                )
                state.enqueue_progress(25)
                utils.step_delay()
                inp = driver.find_element(By.XPATH, VERIFICATION_INPUT_XPATH)
                inp.click()
                inp.clear()
                inp.send_keys(code)
                state.enqueue_progress(50)
                utils.step_delay()
                submit_btns = driver.find_elements(By.XPATH, VERIFICATION_SUBMIT_XPATH)
                if submit_btns:
                    submit_btns[-1].click()
                state.enqueue_progress(75)
        except state.ShutdownRequested:
            raise
        except Exception as e:
            LOG.warning("SSE 2FA path failed (will wait for manual completion): %s", e)
            print("SSE 2FA path failed; waiting for you to complete verification in the browser...", file=sys.stderr)

        verify_wait = WebDriverWait(driver, config.verify_wait_timeout)
        verify_wait.until(returned_to_kalshi)
        print("Back on Kalshi.", file=sys.stderr)
        return True
    except state.ShutdownRequested:
        raise
    except Exception as e:
        LOG.exception("Login failed: %s", e)
        print("Login failed.", file=sys.stderr)
        return False
