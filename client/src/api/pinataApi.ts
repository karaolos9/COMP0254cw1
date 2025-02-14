const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_USER;

// Add delay between requests to prevent rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchPinataItems() {
  try {
    const response = await fetch('/api/pinata/data/pinList?pageLimit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        await delay(1000);
        return fetchPinataItems();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Pinata:', error);
    throw error;
  }
}

export async function fetchPinataItemById(id: string) {
  try {
    await delay(500);
    const response = await fetch(`/api/pinata/data/pinList?hashContains=${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        await delay(1000);
        return fetchPinataItemById(id);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.rows?.[0] || null;
  } catch (error) {
    console.error('Error fetching from Pinata:', error);
    throw error;
  }
} 