const PINATA_BASE_URL = 'https://api.pinata.cloud';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT_ADMIN;

export async function fetchPinataItems() {
  try {
    const response = await fetch(`${PINATA_BASE_URL}/data/pinList?timestamp=${Date.now()}&pageLimit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Pinata:', error);
    throw error;
  }
}

export async function fetchPinataItemById(id: string) {
  try {
    const response = await fetch(`${PINATA_BASE_URL}/data/pinList?hashContains=${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.rows?.[0] || null;
  } catch (error) {
    console.error('Error fetching from Pinata:', error);
    throw error;
  }
} 