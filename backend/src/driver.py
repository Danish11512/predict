"""Create Selenium Chrome WebDriver from config."""
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

import config


def create_driver():
    opts = Options()
    if config.is_headless:
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
    if config.is_container:
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
    if not config.is_headless:
        opts.add_argument("--window-size=1280,720")
    service = Service()
    return webdriver.Chrome(service=service, options=opts)
