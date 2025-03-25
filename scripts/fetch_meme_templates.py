import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from sentence_transformers import SentenceTransformer

# Set up Selenium in headless mode
options = webdriver.ChromeOptions()
options.add_argument("--headless")
driver = webdriver.Chrome(options=options)

# Load embedding model (same dimensionality as your JavaScript expects)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Scrape meme templates from a website (e.g., memegenerator.net)
def scrape_templates():
    driver.get("https://memegenerator.net/")
    time.sleep(3)  # Wait for page load
    templates = []
    elements = driver.find_elements(By.CLASS_NAME, "character-card")
    for elem in elements:
        img = elem.find_element(By.TAG_NAME, "img")
        name = elem.find_element(By.TAG_NAME, "h4").text
        image_url = img.get_attribute("src")
        templates.append({"name": name, "imageUrl": image_url})
    return templates

# Enhance templates with Groqcloud descriptions and embeddings
def enhance_templates(templates):
    api_key = "your_groqcloud_api_key"  # Replace with your Groqcloud API key
    headers = {"Authorization": f"Bearer {api_key}"}
    for template in templates:
        # Generate description
        response = requests.post(
            "https://api.groq.com/v1/chat/completions",
            headers=headers,
            json={
                "model": "llama3-8b-8192",
                "messages": [{"role": "user", "content": f"Describe this meme template: {template['name']}"}],
                "max_tokens": 100
            }
        )
        if response.status_code == 200:
            template["description"] = response.json()["choices"][0]["message"]["content"].strip()
        else:
            template["description"] = template["name"]
        # Compute embedding
        text = template["description"] or template["name"]
        template["embedding"] = model.encode(text).tolist()
        template["id"] = len(templates) + 1  # Simple unique ID
    return templates

# Update templates.json
def update_templates_json(new_templates):
    file_path = "../server/templates.json"  # Adjust path as needed
    try:
        with open(file_path, "r") as f:
            existing_templates = json.load(f)
    except FileNotFoundError:
        existing_templates = []
    
    # Remove duplicates based on name
    existing_names = {t["name"] for t in existing_templates}
    unique_new = [t for t in new_templates if t["name"] not in existing_names]
    updated_templates = existing_templates + unique_new
    
    with open(file_path, "w") as f:
        json.dump(updated_templates, f, indent=2)

# Main execution
if __name__ == "__main__":
    print("Scraping meme templates...")
    templates = scrape_templates()
    print(f"Found {len(templates)} templates. Enhancing with AI...")
    enhanced_templates = enhance_templates(templates)
    print("Updating templates.json...")
    update_templates_json(enhanced_templates)
    driver.quit()
    print("Done!")