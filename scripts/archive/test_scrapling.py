from scrapling.fetchers import StealthyFetcher
import google.generativeai as genai
import json
import csv

# Initialize your API key securely
# genai.configure(api_key="YOUR_API_KEY")

# gemini-2.5-flash is the current highly capable, low-cost workhorse.
# (Use 'gemini-2.0-flash' if you want the absolute lowest cost per token)
model = genai.GenerativeModel('gemini-2.5-flash')

def extract_lead_data(clean_text, target_industry="cold storage"):
    print("Feeding clean text to Gemini...")
    
    # We strictly define the JSON keys so your CSV logic never breaks
    prompt = f"""
    Analyze the following text extracted from a {target_industry} company's website.
    
    Extract the data and return ONLY a valid JSON object with these exact keys:
    - "company_name": String, the name of the company.
    - "management_emails": Array of strings, individual emails specifically for management, founders, or specific departments. Empty array if none found.
    - "classification": String, classify their focus as "Commercial", "Residential", "Both", or "Unknown".
    
    Website Text:
    {clean_text[:15000]} # Slicing the text ensures you stay well under token limits
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1 # Keeps the AI highly deterministic and factual
            )
        )
        
        # Parse the guaranteed JSON response
        lead_data = json.loads(response.text)
        return lead_data
        
    except Exception as e:
        print(f"AI Extraction failed: {e}")
        return None

def sweep_protected_site(url):
    print(f"Sweeping {url} under the radar...")
    
    try:
        # StealthyFetcher mimics human browser fingerprints to bypass bouncers
        page = StealthyFetcher.fetch(url, headless=True, network_idle=True)
        
        # Instead of grabbing raw HTML (which eats up your Gemini tokens and causes 404s),
        # we extract just the visible text from the body of the website.
        body_elements = page.css('body')
        
        if body_elements:
            clean_text = body_elements[0].get_all_text()
            print("Sweep successful. Data extracted.")
            return clean_text
        else:
            print("Page loaded, but no body content found.")
            return None
            
    except Exception as e:
        print(f"Sweep failed: {e}")
        return None

# Testing the URL that failed earlier
target_url = "https://www.lacold.com/"
site_content = sweep_protected_site(target_url)

if site_content:
    # Print the first 500 characters to verify we bypassed the block
    print(site_content[:500])
    
    # Extract structured data using Gemini
    extracted_data = extract_lead_data(site_content, target_industry="cold storage")
    if extracted_data:
        print("\n--- Extracted Data ---")
        print(json.dumps(extracted_data, indent=2))
        
        # Append to your CSV file
        csv_filename = "warm_leads.csv"
        
        # Flatten the emails array into a single string for the CSV column
        emails_string = ", ".join(extracted_data["management_emails"])
        
        with open(csv_filename, mode='a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            # Write row: Company, Emails, Classification
            writer.writerow([
                extracted_data["company_name"], 
                emails_string, 
                extracted_data["classification"]
            ])
            print(f"Saved {extracted_data['company_name']} to CSV.")
