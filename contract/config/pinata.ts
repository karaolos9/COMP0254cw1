import axios from 'axios';

const PINATA_JWT = process.env.PINATA_JWT_ADMIN;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export async function fetchPinataItems() {
  try {
    const response = await axios.get('https://api.pinata.cloud/data/pinList', {
      headers: {
        'Authorization': `Bearer ${PINATA_CONFIG.JWT}`
      }
    });
    
    console.log("Raw Pinata response:", response.data.rows); // Log all items
    
    const items = response.data.rows.map((item: any) => ({
      name: item.metadata?.name || 'Unknown',
      uri: `ipfs://${item.ipfs_pin_hash}`
    }));

    console.log("Processed items:", items); // Log processed items
    return items;
  } catch (error) {
    console.error("Error fetching from Pinata:", error);
    return [];
  }
}

export const PINATA_CONFIG = {
    JWT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzMTdjMDVkZi0wMDIwLTRiMTUtOTM1NC00OThlMzYyZWNhMmUiLCJlbWFpbCI6IjA3MTVzdG9uZUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZjQ3ZDM5M2E0MDUyYjA1NmY3OWMiLCJzY29wZWRLZXlTZWNyZXQiOiJlNjk4MjQwOGU5NmVlOTA1YTdhYzMyMjE3MjQ5NzMzNGM3YTA0OGIzNzE0NDUzYzhkNTJlYzFiNWNkMTljY2VmIiwiZXhwIjoxNzcwMTM5MzEzfQ.CaT__jSkLWkGSCxFK6oAQutPmYxExdKpe55n4qMeZDc",
    API_URL: "https://api.pinata.cloud",
    GATEWAY: "https://gateway.pinata.cloud/ipfs"
}; 