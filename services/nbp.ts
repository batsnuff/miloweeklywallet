// Service to fetch Exchange Rates from NBP (Narodowy Bank Polski)

export const fetchEurPlnRate = async (): Promise<number> => {
  try {
    // Table A, EUR
    const response = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
    if (!response.ok) throw new Error('NBP API Failed');
    
    const data = await response.json();
    const rate = data?.rates?.[0]?.mid;
    
    if (rate && typeof rate === 'number') {
      return rate;
    }
    return 4.30; // Fallback average
  } catch (error) {
    console.warn('Could not fetch NBP rate, using fallback.', error);
    return 4.30; // Safe fallback
  }
};