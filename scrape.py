import os
import requests
from bs4 import BeautifulSoup
import time
import re

def create_pokemon_directory():
    cards_dir = os.path.join(os.getcwd(), 'pokemon_cards')
    os.makedirs(cards_dir, exist_ok=True)
    return cards_dir

def clean_filename(title):
    # Remove invalid filename characters and replace with underscore
    clean = re.sub(r'[<>:"/\\|?*]', '_', title)
    # Remove · and PRE # from the title
    clean = clean.replace(' · Prismatic Evolutions (PRE) #', '_')
    return clean.strip()

def scrape_and_download_cards(url, output_dir):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        articles = soup.find_all('article', class_='type-pkmn_card')
        
        for article in articles:
            time.sleep(2)
            link = article.find('a', class_='card-image-link')
            img = article.find('img', class_='card-image')
            
            if link and img and 'title' in link.attrs and 'src' in img.attrs:
                img_url = img['src']
                title = link['title']
                
                # Clean the title for use as filename
                filename = clean_filename(title) + '.jpg'
                filepath = os.path.join(output_dir, filename)
                
                try:
                    img_response = requests.get(img_url, headers=headers)
                    img_response.raise_for_status()
                    
                    with open(filepath, 'wb') as f:
                        f.write(img_response.content)
                    print(f'Downloaded: {filename}')
                    
                    # Add small delay between downloads
                    time.sleep(0.5)
                    
                except Exception as e:
                    print(f'Error downloading {img_url}: {e}')
                    
    except Exception as e:
        print(f'Error fetching webpage: {e}')

if __name__ == "__main__":
    cards_dir = create_pokemon_directory()
    url = 'https://pkmncards.com/set/prismatic-evolutions/'
    scrape_and_download_cards(url, cards_dir)